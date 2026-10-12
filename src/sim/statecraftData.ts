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
 * (`deferred` on the row, and `docs/deprecated/statecraft-cards.md`) rather than bent into a
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
 * A card is what it prints
 * ------------------------
 * **There are no levels** (the user's ruling of 2026-09-04: *"no more upgrading
 * altogether, all cards are as is"*). A row's `effects` are its whole face,
 * held once, in every empire that drafted it. The three fields that used to say
 * otherwise — `upgrade`, `maxLevel` and `upgradable` — are gone from this table
 * with the ladder that read them, and so is `maxOrderLevel` from the config
 * block. What was second-drafted is now simply another card, which is the whole
 * of what the ruling bought: a draft is always "widen", never "widen or deepen".
 *
 * What a second draft *is* now is a **skip**: a hand nobody wants is passed, and
 * the pass buys rarer cards next time (`OrderDef.rarity`, `rarityWeights` and
 * `skipPity` below, spent by `skipOrderOffer`).
 */

import statecraftJson from '../../data/statecraft.json';
// **The decks' own files** (the decks rework, D1a, the orchestrator's structural
// addition): a live Order lives in `data/decks/<deck>.json`, one file a deck,
// with the generic and cross-type rows in `common.json` — so six agents may
// enter six decks in parallel without six-way conflicts in one file. The
// retired rows stay in `statecraft.json`; nothing moves. The eight `orders`
// maps fold into one registry (`STATECRAFT.orders`) with an id-collision check,
// and every reader of the table reads the fold.
import commerceDeck from '../../data/decks/commerce.json';
import commonDeck from '../../data/decks/common.json';
import devotionDeck from '../../data/decks/devotion.json';
import dominionDeck from '../../data/decks/dominion.json';
import expansionistDeck from '../../data/decks/expansionist.json';
import magisterialDeck from '../../data/decks/magisterial.json';
import scientificDeck from '../../data/decks/scientific.json';

// Type-only in both directions with `beadData.ts`, exactly as `religionData.ts`
// is: a bead's boon carries ordinary `CardEffect`s and a bead id is a `CardId`,
// and a *value* import either way would turn a type cycle into a runtime one.
import type { BeadCardId, BeadGrantId } from './beadData';
import type { BuildingCategory, BuildingId, ProductionCategory } from './buildingData';
// Type-only in both directions, exactly as `religionData.ts` is. See `CardId`.
import type { Family, GreatPersonId } from './greatPeopleData';
import type { ImprovementId } from './improvementData';
// Type-only in both directions, exactly as `beadData.ts` is: a leader's bonus
// and its deck's cards carry ordinary `CardEffect`s, and both are `CardId`s.
import type { LeaderAbilityId, LeaderId } from './leaderData';
import type { ModifierStage } from './yields/stages';
import type { ProjectId, ProjectPayout } from './projectData';
import type { BeliefId, ConsecrationId, RiteId } from './religionData';
import type { CityYieldKey, ResourceId, ResourceKind } from './resourceData';
import type { TerrainId } from './terrainData';
// Type-only, so no load-time edge: a route's medium is one vocabulary and the
// card table names it rather than respelling it. See `CardPaysEffect.mode`.
import type { RouteMode } from './routes';
// Type-only in both directions, exactly as `beadData.ts` and `religionData.ts`
// are: a technology's row carries ordinary `CardEffect`s and a tech id is a
// `CardId`, and a *value* import either way would turn a type cycle into a
// runtime one. See `CardId`'s tenth class.
// Type-only in both directions for `techData.ts`'s reason exactly: a malice's
// row carries ordinary `CardEffect`s and a malice id is a `CardId`, while
// `maliceData.ts` reads `SlotType` and the effect union off this file. A *value*
// import back the other way would turn a type cycle into a runtime one. See
// `CardId`'s eleventh class.
import type { MaliceId } from './maliceData';
import type { AbilityId, TechAge, TechId } from './techData';
import type { ModelClass, UnitCategory, UnitStamp, UnitTypeId } from './unitData';

// --- ids --------------------------------------------------------------------

export type GovernmentId = keyof typeof statecraftJson.governments & string;
export type DoctrineId = keyof typeof statecraftJson.doctrines & string;
/**
 * An Order's id — a key of **any** of the eight files' `orders` maps (the
 * retired shelf in `statecraft.json`, the six decks, the commons), so a row
 * D1b lands in `data/decks/dominion.json` is an `OrderId` with no edit here.
 */
export type OrderId = keyof (typeof statecraftJson.orders &
  typeof dominionDeck.orders &
  typeof expansionistDeck.orders &
  typeof commerceDeck.orders &
  typeof devotionDeck.orders &
  typeof scientificDeck.orders &
  typeof magisterialDeck.orders &
  typeof commonDeck.orders) &
  string;

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
 *
 * **Eight classes since the Bead Race**, and the eighth is the quietest: a
 * bead's boon may carry a *cap* — a permanent step in contentment, in authority
 * capacity, in route capacity — written in this vocabulary on a row of
 * `beads.json` and read by this evaluator through `liveEffects`' ninth source.
 * A bead is not drafted and not slotted; like every card since the 2026-09-04
 * ruling, it is exactly what its row prints.
 *
 * **Nine classes since the tree pass of 2026-08-30**, and the ninth is held for
 * as long as the game lasts: a *technology* may carry `effects` in this
 * vocabulary (`TechDef.effects`), read by this evaluator through `liveEffects`'
 * tenth source. It is a card for the reason a wonder is — what differs is only
 * how it is acquired, which is `tech.ts`'s business — and, like a wonder and a
 * bead, it is never drafted and never slotted. Ids stay unique across the whole
 * table: no technology id is any other class's id, and `test/sim/tech.test.ts`
 * pins that.
 */
export type CardId =
  | GovernmentId
  | DoctrineId
  | OrderId
  | BeliefId
  | RiteId
  | BuildingId
  | GreatPersonId
  | BeadCardId
  | TechId
  // **Ten classes since the Cathedral** (design ledger Entry LV), and the tenth
  // is the only one nobody chooses: a consecration is *rolled* when a cathedral
  // is topped out and is then a fact about that town. Like a wonder, a bead and
  // a technology it is never drafted and never slotted. Ids stay unique across
  // the whole table.
  | ConsecrationId
  // **Eleven classes since the wager** (batch G3, `docs/wager.md` §4), and the
  // eleventh is the only one a player would rather not have: a *malice* is dealt
  // to a realm that missed the bar it staked, seated in one of its own chairs by
  // the world, and paid through this evaluator like every other card. It is the
  // second class that is never drafted and *is* slotted — which is exactly why
  // it is a class rather than a flag on an Order row (`maliceData.ts`'s
  // docblock). Ids stay unique across the whole table.
  | MaliceId
  // **Thirteen classes since the leaders** (batch L2a, `docs/flags.md` (dddd);
  // re-aimed at the second cut in L6a), and they arrive as a pair because a
  // figure gives a seat two different things: `LeaderId` names the **figure**,
  // which is what a line says when it means "because of who you are", and
  // `LeaderAbilityId` names **one of its two abilities**, which is what a line
  // says when it means "because of this rule". Both are read through
  // `liveEffects`' twelfth source and described by the same describers as an
  // Order, which is the whole argument for writing a leader in the card
  // vocabulary at all. Ids stay unique across the whole table, and
  // `test/sim/leaders.test.ts` pins that.
  | LeaderId
  | LeaderAbilityId;

/**
 * **The six decks** (`docs/six-decks-first-cut.md` "The structure"; the decks
 * rework, `docs/plans/decks-rework.md` D1a, ruled `docs/flags.md` (iiiiii)).
 *
 * A deck is the thing a card *belongs to* and the thing a leader *holds*: every
 * figure carries two of these on its row, Ibn Battuta carries all six, and a
 * seat drafts from its own decks plus the shared commons and the cross-type
 * rows that name either of its decks (`deckPoolOf`, `statecraft/draft.ts`).
 * Six and no seventh, because the generic pool is deliberately *not* a deck —
 * a row with no deck membership belongs to everyone, and giving that a name
 * would be a seventh deck every rainbow draw had to sample (the design doc's
 * rule 4 says so in as many words).
 *
 * The order here is the design doc's table order, and it is the order every
 * sweep walks: a rainbow seat's two sampled decks are drawn out of this list,
 * and a draw that depends on an order must depend on an order the data carries.
 */
export type DeckId =
  | 'dominion'
  | 'expansionist'
  | 'commerce'
  | 'devotion'
  | 'scientific'
  | 'magisterial';

/** The six decks, in the design doc's order. See `DeckId`. */
export const DECK_IDS: readonly DeckId[] = [
  'dominion',
  'expansionist',
  'commerce',
  'devotion',
  'scientific',
  'magisterial',
];

/** How a deck reads on a card, a badge and a leader's face. One table, one voice. */
export const DECK_WORDS: Record<DeckId, string> = {
  dominion: 'Dominion',
  expansionist: 'Expansionist',
  commerce: 'Commerce',
  devotion: 'Devotion',
  scientific: 'Scientific',
  magisterial: 'Magisterial',
};

export function isDeckId(value: unknown): value is DeckId {
  return typeof value === 'string' && (DECK_IDS as readonly string[]).includes(value);
}

/**
 * **The five content bands**: the deck sheets' Tier 0 to Tier IV. A band is
 * drawable when the seat's draft count has reached rung `band` of `tierLadder`
 * **and** its research age has reached `band + 1` (the age check of
 * 2026-09-16; `bandOpen`, `statecraft/draft.ts`).
 *
 * Band 4 (Tier IV) was added in the deck implementation's foundation batch.
 * There is no fifth research age, so band 4's age gate is the last age, the
 * same as band 3's; what separates the two is the ladder rung.
 */
export type Band = 0 | 1 | 2 | 3 | 4;

/** The five bands in order. `tierLadder` has one rung per member. */
export const BANDS: readonly Band[] = [0, 1, 2, 3, 4];

/** The highest band. `bandTierAt` never answers more than this. */
export const LAST_BAND: Band = BANDS[BANDS.length - 1]!;

/**
 * **What a charter hands over when it is drafted** (the design doc's "The
 * structure": *"Five Scientific research Charters and three Commerce building
 * Charters instead unlock their named content once drafted and never occupy a
 * chair"*, and the two Devotion rite charters beside them).
 *
 * A charter is an Order row with this field on it. It is drafted like any
 * other — dealt into a hand by its deck, band and rarity — and the pick is
 * where it acts: `applyCharter` writes the named technology, building or rites
 * onto the seat (`Player.charteredTechs` and its two siblings), once, and the
 * card then sits in the collection as a record of the grant. It never enters a
 * chair (`slotOrderError` refuses it), because a charter has nothing to say
 * while seated — the grant is a fact about the seat from the moment of the
 * pick, and a chair would be a chair spent on a card that does nothing there.
 *
 * What the grant *opens* and what it *gives* are two different things, and the
 * design doc is exact about it: a chartered technology becomes **researchable**
 * (the research gate reads the list), a chartered building becomes
 * **buildable** (through the existing `unlockedByCard` seam), chartered rites
 * become **learnable** (the ability gate reads the list) — and every one of them
 * still costs what it costs. A charter grants neither a free technology nor a
 * free building.
 */
export interface CharterSpec {
  unlocks: {
    tech?: TechId;
    building?: BuildingId;
    rites?: RiteId[];
  };
}

/**
 * Which slot an Order fits, and therefore what a government's spread is counted
 * in.
 *
 * **Unread by the draw and the chairs since the decks rework** (D1a): every
 * chair is universal now — a government supplies a *count* of chairs and no
 * layout — so `slotLayout` answers `'wildcard'` for every chair and
 * `orderFitsSlot` is true of every card. The type stays because the retired
 * rows still carry the field (the Compendium prints it, a save may hold a row
 * that pays by it — `slottedOrdersOfFlavour` reads the *card's* flavour, never
 * the chair's) and because a malice's row names the chair it takes in this
 * vocabulary. It joins nothing new: a row written after the rework carries no
 * `slot` at all.
 */
export type SlotType = 'military' | 'economic' | 'wildcard';

/** The slot types in the order a spread is printed and a screen lays them out. */
export const SLOT_TYPES: readonly SlotType[] = ['military', 'economic', 'wildcard'];

/**
 * Which pool an Order is drafted from. **Pool power steps per government, not
 * per tier** (Entry XV), so a pool is named after the government that opens it.
 */
export type OrderPool =
  | 'chiefdom'
  | 'governmentI'
  | 'governmentII'
  | 'governmentIII'
  /**
   * The two late pools, built 2026-09-05 for the first full playthrough. They
   * are members here rather than a fallback in `poolOfGovernment` because a
   * government that dealt the *previous* government's shelf is a government
   * whose adoption bought a player nothing — which is exactly what a tier-29
   * seat got while `poolOfGovernment` answered `governmentIII` for every rung
   * above eighteen. A pool is named after the government that opens it, so the
   * ladder's last two rungs name their own.
   */
  | 'governmentIV'
  | 'governmentV';

/**
 * How often a card turns up in a draft — `OrderDef.rarity`, the deck's only
 * weight since the levelling ruling of 2026-09-04.
 *
 * Three rungs and no fourth, because three is what the design worksheet marks
 * (● ◆ ○) and the marks are the spec of record. They are ordered here weakest
 * pull to strongest, which is the order the weights are read in and the order a
 * screen would print them.
 */
export type OrderRarity = 'common' | 'uncommon' | 'rare';

/**
 * The pools in ladder order — which is also "which pool retires when": since
 * 2026-09-03 a pool retires whole the moment the next government opens, so this
 * order is the order they go out in as well as the order they come in.
 */
export const ORDER_POOLS: readonly OrderPool[] = [
  'chiefdom',
  'governmentI',
  'governmentII',
  'governmentIII',
  'governmentIV',
  'governmentV',
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
  /**
   * The five threads the art pass drew marks for (2026-08-28) and the table had
   * no words for yet. They are here so `line` stays a *closed* union — a row
   * naming a thread nothing draws is a card the gallery cannot group — and
   * `src/art/lineMarks.ts`' temporary `PendingCardLine` collapses onto them.
   *
   * Nothing in the simulation switches on a `line`, exactly as nothing switches
   * on a `tier`: it is the screen's grouping and the designer's shorthand.
   */
  | 'court'
  | 'cloister'
  | 'charter'
  | 'ploughshare'
  | 'highlands'
  /**
   * **The Tide** — the sea, the coast and the trade that runs along it. Named in
   * the worksheet's own theme table since the threads were drawn and declared
   * here in B1, when Boatwrights and Fish Weirs became the first two rows to
   * claim it. Its mark and its ink joined `src/art/lineMarks.ts` and
   * `style.css` in the same pass, which is the rule for a new visual asset.
   */
  | 'tide'
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
  /**
   * The town's **own hex has a river running along one of its edges** — The
   * Great Yangtze, whose provinces are the ones the river reaches.
   *
   * `freshwater`'s narrow half and a member of its own rather than a flag on
   * it, for `terrainBeside`'s reason exactly: the two are different
   * measurements of the same ground. That one asks *can this town drink*, which
   * a lake next door answers and a card in the law (Cistern Works) can declare
   * outright; this asks *was this town planted on a river*, which is a fact
   * about where the settler stopped that nothing later can grant. A figure who
   * pays for river towns is paying for the founding decision, so a cistern must
   * not buy the bonus and a lakeside town must not collect it.
   *
   * Read off `Tile.riverEdges` — the mask itself, the field `water.ts` is the
   * only writer of — because a river in this game runs along an *edge* and "any
   * edge at all" is the whole question. Never `Tile.freshwater`, which is the
   * derived answer to the other question.
   */
  | { test: 'riverside' }
  /**
   * A mountain stands within `radius` hexes of the town — one by default, which
   * is the town's own hex plus the ring of six, the reach every other "beside
   * this town" clause in the game takes.
   *
   * `radius` is `frontier`'s field one scope over and it arrived for the same
   * reason: the Stargazers' Charter's Orrery reads two hexes, and the row's
   * own number is the honest place for a distance a card names out loud. Absent
   * is the reading every row written before it had, so nothing moves.
   */
  | { test: 'mountainAdjacent'; radius?: number }
  /** Some tile within `radius` (default 3) belongs to another civilization. */
  | { test: 'frontier'; radius?: number }
  /** The town was taken by force, ever (`City.captured`). */
  | { test: 'captured' }
  /**
   * The town is a **puppet** — taken and never taken in (`City.puppet`) — The
   * Heavenly Khagan's vassals and The Tribute of the Han's.
   *
   * `captured`'s neighbour and emphatically not a reading of it: that one is
   * sticky and says *whether ever*, so a conquest the captor annexed is still
   * `captured` forever, while this is the **standing arrangement** the captor
   * may end at any turn by annexing. A tribute is owed by a vassal and not by a
   * province, which is exactly the difference, and it is the difference a player
   * can act on — annex the town and the tribute stops.
   *
   * Asked of the **town's owner**, exactly as `capital` and `captured` are: a
   * puppet is somebody's puppet, and a card read of another empire's town means
   * that empire's arrangement.
   *
   * The scope beside `CountKind`'s `puppetPopulation`, and the two are two
   * questions: that counts the citizens a tribute is quoted per, and this admits
   * the towns a line is paid *in*. A card that wants a share of what a vassal
   * makes can only say it here, because a share is a fact about one town's fold.
   */
  | { test: 'puppet' }
  /** The town is this empire's capital (`capitalCityOf`). */
  | { test: 'capital' }
  /** The town is at least this large. */
  | { test: 'populationAtLeast'; value: number }
  /**
   * The town is **at most** this large — Hearth Songs, whose songs are sung in
   * the villages and not in the capital.
   *
   * `populationAtLeast`'s mirror, and a member of its own rather than a sign on
   * that one for `notFreshwater`'s stated reason: there is no `not` composite
   * and there will not be one, so a negation the ratified table actually asks
   * for earns its own arm. Both are inclusive, so a card that pays "size 4 or
   * less" and one that pays "size 4 or more" both reach a town of exactly four —
   * which is the reading the printed words take.
   */
  | { test: 'populationAtMost'; value: number }
  /**
   * A hex **touching the town's own** carries this improvement — The Pilgrim's
   * Purse, whose money is made by standing next door to the shrine.
   *
   * Deliberately the ring of six and not the work radius: "adjacent to a holy
   * site" is a fact about where the town was *put*, which a player can plan a
   * settler around, and a third-ring reading would have made it a fact about
   * where the borders happened to grow. `isMountainAdjacent`'s reach exactly,
   * asked of `Tile.improvement` rather than of the ground — and of the hex
   * itself as well, because a town founded on the shrine is not further from it
   * than its neighbour is.
   */
  | { test: 'adjacentImprovement'; improvement: ImprovementId }
  /** The town controls one of these resources (`openedResource`). */
  | { test: 'holding'; resources: ResourceId[] }
  /** The town controls any resource of this kind. */
  | { test: 'holdingCategory'; category: ResourceKind }
  /**
   * A hex **inside the town's own borders** carries this improvement —
   * Quarrymen's Guild, whose masons are paid for the quarry in the hills the
   * city works.
   *
   * `terrainInBorders` asked of what has been *built* rather than of the ground,
   * and it is a member of its own for that scope's reason exactly: what the
   * borders have taken in is a different question from what touches the centre
   * (`adjacentImprovement`, the ring of six) and from what the centre stands on.
   * A quarry three hexes out is the city's quarry; a quarry over the border is
   * somebody else's. Read over `ownedTiles`, the board's own answer, so a hex a
   * rival's culture swallows stops paying the turn it changes hands.
   */
  | { test: 'hasImprovement'; improvement: ImprovementId }
  /**
   * A combat unit of this town's owner is **standing in it** — River Wardens,
   * whose wardens have to actually be there.
   *
   * The first scope in the union whose answer is a fact about *the pieces on the
   * board* rather than about the ground or the ledger, and it is read through
   * the one sweep that already answers it (`garrisonOf`, which `CountKind`'s
   * `garrison` counts): a garrison is a garrison whether a card counts it or
   * asks whether there is one, and two answers to "who is standing here" is
   * exactly the drift the one-evaluator rule exists to prevent.
   *
   * A boolean question, so it **cannot stack**: three spearmen in the town admit
   * it once, which is what "when a unit is stationed in a city" says. A card
   * that wants the count says `pays` count with `garrison`.
   */
  | { test: 'garrisoned' }
  /**
   * The town has finished this building.
   *
   * Entry XXVIII's addition, and the shape that makes "granaries supply +1
   * faith" an ordinary town `pays` line rather than a new effect kind: a
   * building's yield *is* a city yield in the towns that have the building.
   */
  | {
      test: 'hasBuilding';
      building: BuildingId;
      /**
       * **And it has stood at least this many turns** — The Long Study's library,
       * The Learned Realm's (batch D2d, the age stamp).
       *
       * A field rather than a member of its own, and for `queueDepth`'s stated
       * reason exactly: "this town has a Library" and "this town has a Library
       * that has stood twenty turns" are one question with a threshold on it, and
       * the figure is the card's. Absent is the reading every row written before
       * it had — any Library at all — so nothing moves.
       *
       * Read through `buildingAge` (`state.ts`), which is a subtraction against
       * `state.turn` off `City.buildingTurns`' absolute stamp: **nothing ticks**,
       * and the scope starts admitting on the turn the arithmetic passes. A town
       * holding the row with no stamp on it admits nothing, which is the silence
       * every absent fact in this vocabulary keeps — "cannot be shown to be old
       * enough" rather than "new".
       *
       * Inclusive, exactly as `populationAtLeast` is: a library raised on turn 10
       * is twenty turns old on turn 30 and admits there.
       */
      standingTurns?: number;
    }
  /**
   * A **rite is running** in this town — The Vigil, whose lamp is lit only while
   * somebody is keeping the watch.
   *
   * Asked of `cityRite` (`religion.ts`), which is the one reading of "what is
   * this town keeping" and is itself derived from `City.timed`'s absolute
   * stamps — so nothing ticks, nothing is stored, and the scope stops admitting
   * on the turn the rite's own expiry passes. A boolean rather than a named
   * rite: the belief is about the vigil and not about which prayer is being
   * said, and a row that wanted one rite would name it the day one is written.
   */
  | { test: 'keepingRite' }
  /**
   * The town holds a building that **supplies this yield at all** — Hero of
   * Alexandria's "a wonder that supplies science".
   *
   * `hasBuilding` asked of what a row *does* rather than of which row it is, and
   * it is `CountKind`'s `scienceBuildings` widened to any voice and lifted to a
   * scope. Read off `BuildingDef.yields`, so a designer who retunes a library
   * cannot leave a legacy paying for something that no longer teaches anybody —
   * the same bargain `resourceKind`'s `yields` strikes one table down.
   *
   * `wonder: true` narrows it to the rows the data calls wonders (`isWonder`),
   * which is the half Hero's ratified text asks for. Absent counts every
   * building, wonders included, because a wonder *is* a building.
   */
  | { test: 'hasBuildingYielding'; yields: CityYieldKey; wonder?: boolean }
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
   * A hex of this terrain stands **inside the town's own borders** —
   * Star-Gazers' mountain, which the ratified text spells "the mountain hex is
   * within the city boundaries".
   *
   * `onTerrain`'s sibling one ring wider, and the two are deliberately separate
   * questions rather than a radius argument on one: `onTerrain` is a fact about
   * *the ground the centre was planted on* and this is a fact about *what the
   * borders have taken in*, which moves with culture. Read over
   * `ownedTiles(state, city)` — the board's own answer to "whose hex is this" —
   * so a mountain a rival's culture swallowed stops paying the turn it changes
   * hands.
   *
   * It is **not** `mountainAdjacent`, which is the ring of six around the centre
   * and reaches ground nobody owns. A card may want either; the table now says
   * which.
   */
  | { test: 'terrainInBorders'; terrain: TerrainId }
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
   * The town's **own hex or one of the six touching it** is this terrain —
   * Petra, which wants a caravan city at the edge of the sand.
   *
   * The third ring in the family, and the three are deliberately three questions
   * rather than one with a radius on it: `onTerrain` asks what the *centre*
   * stands on, this asks what the centre stands **at the edge of**, and
   * `terrainInBorders` asks what the *borders* have taken in — a set that grows
   * with culture and shrinks when a rival's does. A radius argument would have
   * made the second and third one shape and then lied about it, because they are
   * not the same measurement: the ring of six is fixed ground that no border can
   * move, and a hex three rings out is inside the borders and not beside
   * anything. `mountainAdjacent` is this exact reach, written before the family
   * existed and kept because the mountain rows spell their radius; a row that
   * wants a terrain names it here.
   *
   * Ruled on 2026-09-08 for Petra (the user: *"To build petra, you only need to
   * be settled on or adjacent to desert"*, flags (uu)), which had been the
   * centre alone — a wonder about a desert trading city that only a town founded
   * *in* the sand could raise.
   */
  | { test: 'terrainBeside'; terrain: TerrainId }
  /**
   * The town's **own hex** carries a resource of this kind — The Prize Grounds'
   * city founded on a luxury.
   *
   * `onTerrain`'s sibling and a fact about the ground the centre was planted on,
   * asked of the same hex: a town with a silk seam in its third ring is not a
   * town *settled on* silk, and a scope that counted the ring would be a second,
   * fuzzier answer to a question `holdingCategory` already answers exactly. So
   * the two are the pair — this one is where the settler stopped, that one is
   * what the borders have taken in.
   *
   * `TileCondition`'s `resourceKind` one scale up, read off `Tile.resource` and
   * the resource's own row, so a designer who reclassifies a seam moves the
   * scope with it.
   */
  | { test: 'onResourceKind'; kind: ResourceKind }
  /**
   * A hex **touching the town's own** carries a great person's work — The
   * Master's Presence.
   *
   * `adjacentImprovement` asked of the *family* rather than of the row, exactly
   * as `TileCondition`'s `greatWork` is: it reads the marker the improvement
   * table already carries (`ImprovementDef.greatPerson`, presence is the marker)
   * rather than a list of five names, so a sixth work joins for free. The ring
   * of six and the hex itself, which is `adjacentImprovement`'s own reach and
   * for its reason — a town founded on the academy is not further from it than
   * its neighbour is.
   *
   * A boolean question, so it **cannot stack**: two academies beside one town
   * admit it once, which is what The Master's Presence's "never stacks" says.
   */
  | { test: 'adjacentGreatWork' }
  /**
   * This town is **building** a row of this category right now — The
   * Wonder-Feasts' feast, thrown while the scaffolding is up.
   *
   * `EmpireCondition`'s `queueHolds` at the other scale, and the two are
   * deliberately the same word for the same question: that one asks *is anybody
   * building one* and opens a clause wherever the clause lands, and this one
   * asks *is this town building one* and lands in the towns that are. Read off
   * `City.queue` through `queueCategory` — the one place a row is sorted into a
   * category — so a project, a wonder and a building are told apart here by
   * exactly the rule production tells them apart by.
   *
   * The **front row only**, because a city has one basket and it pays for
   * `queue[0]`: a wonder standing second is a plan rather than a building site,
   * and a feast thrown for it would be a feast thrown for every row a player
   * ever queued.
   */
  | {
      test: 'queueHolds';
      category: ProductionCategory;
      /**
       * And the row at the front is one of the realm's **single great houses** —
       * The Merchant Works' (batch C4).
       *
       * `CardProductionBonusEffect.empireBuilding` and
       * `CardWindfallRiderEffect.empireBuilding` asked about the row being built
       * and the row just finished; this asks about the row being built *right
       * now*, off the same marker (`BuildingDef.oncePerEmpire`) and with the
       * same reading. A wonder is not one of these — `category: 'wonder'` is how
       * a card names that class — so a row meaning both says `any` of two scopes,
       * which is what The Merchant Works does.
       *
       * Meaningful only with `category: 'building'`: a unit and a project carry
       * no such marker, so a scope naming both admits nothing rather than
       * quietly widening.
       */
      empireBuilding?: true;
    }
  /**
   * The town has **at least this many things lined up to build** — The Vizier's
   * Hall's clause, which pays a town that plans ahead and nothing to a town
   * living hand to mouth (`docs/flags.md` (www)).
   *
   * `queueHolds`' sibling and deliberately a second arm rather than a field on
   * it: that one asks *what* is in the queue and this asks *how much*, and a
   * scope that took both would be a scope nobody could print in one clause. Read
   * off `City.queue.length` — the rows themselves, not what they are worth or
   * whether any of them can be paid for this turn, because "has this town a
   * works list" is a question about the list.
   *
   * `atLeast` is on the row rather than fixed here for `queueFloor`'s reason:
   * the figure is the building's, and a second row wanting a deeper list is a
   * JSON row.
   */
  | { test: 'queueDepth'; atLeast: number }
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
  /**
   * The town **follows my religion** — more than half its citizens do
   * (`cityReligion`), and the religion is the one this card's holder founded.
   *
   * The follower pool's scope, and the only one in the union that is about the
   * *reader* as well as about the town: "my" is the empire the effect is being
   * evaluated for, which is why `cityScopeAdmits` takes an optional `viewerId`.
   * Absent viewer answers **false** rather than true — a scope nobody can be the
   * subject of admits nothing, which is the safe reading for a shape whose whole
   * point is that it reaches other people's cities.
   */
  | { test: 'follows' }
  /**
   * The town is **joined to its empire's capital by road** — Empire-Building's
   * contented provinces, and Movable Type's second helping of the same.
   *
   * The one scope in the union whose answer is a fact about the *board between*
   * two towns rather than about a town, and it is answered by the fill the gold
   * ledger already runs (`connectedCities`, `roads.ts`): a city centre is a
   * junction, the fill crosses this empire's ground or nobody's, and the capital
   * is what the others are joined *to*. So "connected" means here exactly what
   * it means in the treasury line, and a road cut by a rival's border stops
   * paying both at once.
   *
   * A capital admits **nothing**: it is not connected to itself, it is the thing
   * connection is measured from — the same reading `connectedCities` takes when
   * it leaves the capital out of its own list.
   */
  | { test: 'connected' }
  /**
   * The **last town this empire came by** — The Charter of the Marches, whose
   * whole point is that the frontier is wherever you last planted a flag.
   *
   * `capital`'s opposite number, and the second scope in the union that admits
   * exactly **one** town rather than a class of them: a card written on it moves
   * the moment a settler stops walking, which is the decision the row is about
   * — keep expanding and the charter keeps travelling, stop and it settles on
   * the last place you built.
   *
   * Read off `state.cities`, which is **founding order** and the same order
   * every other sweep in the simulation walks: the last entry this empire owns
   * is the newest town it holds. A town taken by force keeps the place in that
   * order it was founded at, so a conqueror who storms a young capital really
   * has come by a newer town than his own last colony — which is the honest
   * reading of "newest" and the only one the board can answer without a second
   * record. An empire holding nothing admits nothing.
   */
  | { test: 'newest' }
  /**
   * **Trade routes meet this town** — the Bank's coin, which is only worth
   * counting in a town the caravans actually come to, and the three Commerce
   * rows that ask how many rather than whether (batch C5).
   *
   * The one scope whose subject is a *caravan* rather than the town. It began
   * as a yes-or-no, for the reason `garrisoned` is one, and it is now a
   * threshold on a tally: The Home Market wants two routes arriving, The
   * Chartered Metropolis three setting out, The League of Cities one setting
   * out and its own mirror for the towns with none. One member with three
   * optional fields rather than four members, because the alternative is
   * spelling `crossing` and the direction again in each of them.
   *
   * Read off the pieces through `countRoutesAt` (`routes.ts`) — `Unit.trade`
   * **is** the route, there is no register, and the tally and the predicate
   * have to be one walk or they will eventually disagree. Only **active**
   * routes are counted (`routeIsLive`), which is the one test there is: a
   * lapsed route sits inert on its cart until the shuttle tidies it, and a town
   * a dead route once ended at is not a town caravans come to. Two of the cards
   * say "paying routes"; the user ruled that decorative (2026-09-19), so there
   * is nothing here for that word to select on.
   *
   * Whoever *sent* the caravan is not asked, exactly as `cityRouteYields` does
   * not ask: a foreign caravan in your market is a caravan in your market. Note
   * that the cards' word "your" costs nothing here — a route setting out from a
   * town belongs to that town's owner by construction, and a domestic route
   * arriving started in another of the same empire's towns.
   *
   * The name is the one this member had when it could only say yes, kept rather
   * than migrated because four data files outside batch C5's fence spell it.
   */
  | {
      test: 'routeEndsHere';
      /**
       * **Which side of a border the road had to cross** — The Entrepôt's, whose
       * whole subject is the foreign cart in your market.
       *
       * `CardPaysEffect.crossing`'s field one shape over and the same reading
       * (`routeIsInternational`, `routes.ts`), so a card asked about a *caravan*
       * and a card asked about the *town it comes to* cannot disagree about what
       * a foreign road is. Absent admits any live route ending here, which is
       * what every row written before it meant.
       */
      crossing?: 'domestic' | 'international';
      /**
       * **Which way the road runs, seen from this town** — routes arriving, or
       * routes setting out. Absent is `'arriving'`, which is what every row
       * written before batch C5 meant.
       *
       * A field rather than a second member because the two directions take the
       * same `crossing` and the same threshold, and a `routeLeavesHere` beside
       * this one would have had to repeat both. The two really are one question
       * asked from the two ends of the same road — `countRoutesAt` answers them
       * with the same walk and the same idea of what "still paying" means.
       */
      direction?: 'arriving' | 'departing';
      /**
       * **How many such routes the town needs.** Absent is one, which is what a
       * yes-or-no always meant.
       *
       * Inclusive, exactly as `populationAtLeast` and `buildingsOfCategory` are,
       * and on the row rather than fixed here for their reason: the figure is
       * the card's.
       */
      atLeast?: number;
      /**
       * **…or at most this many** — The League of Cities' second sentence, the
       * towns that send none.
       *
       * The negation, and it is a field here rather than a `notRouteEndsHere`
       * member (the form `notHasWonder` and `notKeepingRite` take) because a
       * negated route question still has to name a direction and a crossing, and
       * a second member would have carried a second copy of both. `atMost: 0` is
       * the sentence every card in the design actually writes; a row carrying
       * both fields means the band between them, which is a real sentence nobody
       * has written yet.
       */
      atMost?: number;
      /**
       * **What the town at the far end of those routes must be** — The Grain
       * Exchange's *"cities receiving one gain +1 happiness"*, where "one" is a
       * domestic route out of a town with a Granary (batch C8).
       *
       * The field the scope was missing. `crossing` and `direction` narrow a
       * route by facts about the *pair* and by which way it runs; this narrows it
       * by the town at the other end, which is the one thing about a route a
       * town could not previously be asked. Absent counts every route the other
       * three fields admit, which is what every row written before it meant.
       *
       * An ordinary `CityScope`, evaluated by the ordinary evaluator: "from a
       * town with a Granary" is `{ test: 'hasBuilding', building: 'granary' }`
       * and no vocabulary of its own. `countRoutesAt` (`routes.ts`) takes it as a
       * **predicate handed down** rather than as a scope, because that file is a
       * leaf and may not import the evaluator that answers one — the same shape
       * `combat.ts` hands a presser down to the windfall riders.
       *
       * **Do not write a route question inside it.** A `farEnd` that itself said
       * `routeEndsHere` would walk the board once per route per town; nothing
       * asks for that sentence and the evaluator refuses it rather than
       * recursing (see `cityScopeAdmits`' arm).
       */
      farEnd?: CityScope;
    }
  /**
   * **This empire's commercial post stands in the town, and is paying** — The
   * Merchant Commonwealth's provinces, and the Posts line in Commerce (batch
   * D2e).
   *
   * `routeEndsHere`'s neighbour and a different question: that one asks whether
   * carts are coming *now*, and this asks whether they came long enough to leave
   * a house behind. A post is established by a route term of unbroken trading
   * presence and is then permanent, so a card written on it is paying for a
   * relationship that was built rather than for traffic on the day.
   *
   * Asked through `cityPostPays` (`routes.ts`), so the design's two suspensions
   * come with it and no row has to spell them: a post pays nothing while its
   * holder and the town's owner are at war, or while the town is blockaded. The
   * card that wants the footprint whatever the weather is not a scope at all —
   * it is a strength line, and `CombatCondition`'s `inCityWithPost` is where it
   * asks.
   *
   * **Whose post** is the empire the card belongs to, which is the `viewerId`
   * every scope is already handed. That is the whole of the member: a town is
   * admitted for holding *your* house, whoever owns the town — so a row scoped
   * this way and paid `where: 'city'` reaches your own provinces, and the same
   * row carrying `payee: 'host'` reaches the foreign ones.
   */
  | { test: 'holdsPost' }
  /**
   * The town has raised **at least this many buildings of one shelf** — The
   * Civic Stage's *"cities with at least two culture buildings"*, and most of
   * Magisterial's civic line with it.
   *
   * `hasBuilding` asked of *how many* rather than of *which*, and the two are
   * deliberately two members rather than a count on that one: a card that names
   * a Monument means the Monument, and a card that says "several culture
   * buildings" means the shelf and does not care which of them. Read through
   * `buildingsOfCategoryIn` — the same walk `CountKind`'s `buildingsOfCategory`
   * takes with `within: 'city'` — so a card that *counts* a town's culture
   * houses for gold and a card that *admits* the town for having them cannot
   * disagree about how many there are.
   *
   * The shelf is `BuildingDef.category`, the one word every row declares, so an
   * eighth amphitheatre joins every card written on it without an edit here —
   * `CardPaysEffect.category`'s bargain one table over. `atLeast` is on the row
   * rather than fixed here for `queueDepth`'s reason: the figure is the card's,
   * and a row wanting three of them is a JSON row. Inclusive, exactly as
   * `populationAtLeast` is.
   */
  | { test: 'buildingsOfCategory'; category: BuildingCategory; atLeast: number }
  /**
   * **A citizen of this town is standing on one of these works** — The
   * Sculptors' Quarries' masons, who are paid for the quarry somebody is
   * actually cutting.
   *
   * `hasImprovement`'s companion and emphatically not a reading of it: that one
   * asks what lies *inside the borders*, and a quarry in the third ring that
   * nobody works is still the town's quarry by that reading — which is the
   * wrong sentence for a card about labour. This asks `City.workedTiles`, the
   * assignment itself, so the line moves the turn a governor moves a citizen
   * and a town that grows into its quarry starts collecting.
   *
   * A **list**, `anyImprovement`'s shape one scale up and for its reason: the
   * ratified text names one kind of ground ("mines and camps", Lay Offerings)
   * that the improvement table spells as two rows. Asked through
   * `tileConditionHolds` — so `improvementCountsAs` applies here exactly as it
   * does on a hex line, and a variant row joins by carrying `countsAs`.
   *
   * `atLeast` counts them, and it is a field rather than a second member for
   * `buildingsOfCategory`'s reason: "working a quarry" and "working at least
   * two of them" are one question with a threshold on it. Absent is one, which
   * is what every "working a …" row means.
   */
  | { test: 'workingImprovement'; improvements: ImprovementId[]; atLeast?: number }
  /**
   * **A citizen of this town is standing on a great person's work** — The
   * Master's Presence, The Laureate, and Scientific's whole distributed-works
   * line.
   *
   * `workingImprovement` asked of the *family* rather than of the rows, exactly
   * as `TileCondition`'s `greatWork` is and through that very condition: it
   * reads the marker the improvement table already carries
   * (`ImprovementDef.greatPerson`, presence is the marker), so the sixth work
   * added the day a great admiral lands joins every card written on this for
   * free.
   *
   * `adjacentGreatWork` is the other question about the same stones and stays
   * its own member: that one asks whether an academy *stands next door to the
   * centre* — a fact about where the settler stopped — and this asks whether
   * anybody is working it, which is a decision the player makes every turn.
   */
  | {
      test: 'workingGreatWork';
      atLeast?: number;
      /**
       * **And the work has stood at least this many turns** — The Long
       * Inheritance's *"cities working a great-person improvement at least twenty
       * turns old"* (batch D2d).
       *
       * `hasBuilding.standingTurns`' field on a hex instead of on a shelf, and it
       * is passed straight down to `TileCondition`'s `standingSince`, which is
       * where a work's age is actually read: a worked hex is counted here only if
       * that condition holds of it, so "working an academy" and "working an
       * academy that has stood a while" are one walk with one extra clause. A
       * town counted with `atLeast` counts only the works old enough.
       */
      standingTurns?: number;
    }
  /**
   * **A marvel stands in this town** — The Grand Tour's, The Civic Pantheon's,
   * and every Magisterial row whose subject is the town a wonder was built in.
   *
   * `hasBuilding` asked of the class rather than of the row (`isWonder`, the
   * data's own declaration), and it is the predicate `CountKind`'s `wonders`
   * with `within: 'city'` could never be: a count says *how many* and pays per
   * marvel, and "cities containing a wonder" admits the town once however many
   * it holds. Both read the same declaration, so the shelf a card counts and
   * the town a card admits cannot disagree.
   *
   * Pay follows the stones, like every other wonder reading: a captured town
   * carries its marvel to its captor, and the scope moves with it the turn the
   * town changes hands.
   */
  | { test: 'hasWonder' }
  /**
   * **No marvel stands in this town** — The Wonder Commonwealth's other half,
   * which pays the towns the marvels passed over.
   *
   * A named inverse rather than a `not` composite, and this is the batch that
   * had to decide (D2a). The union already refuses one twice over
   * (`notFreshwater`, `notCapital`, `populationAtMost`), and the refusal gets
   * *stronger* now that `all` and `any` both stand: a `not` over those two
   * would make the scope a full boolean algebra, and a full boolean algebra is
   * a thing no describer can print — "every city that is not (coastal and
   * keeping a rite)" is a sentence a first-time player cannot act on, which is
   * hard rule 7 said as a type. A named member costs one arm and one phrase and
   * buys a clause a player can read. So negations are written down one card at
   * a time, exactly as the three before them were, and a scope nobody has asked
   * the opposite of never grows one.
   */
  | { test: 'notHasWonder' }
  /**
   * **No rite is running in this town** — The Rites Commonwealth's penalty,
   * which is the whole point of a card that rewards the towns that do keep one.
   *
   * `keepingRite`'s mirror, through the same `cityRite` reading so the two
   * halves of one card cannot both be true of one town. A named member for
   * `notHasWonder`'s stated reason.
   */
  | { test: 'notKeepingRite' }
  /**
   * **One of the realm's single great houses stands in this town** — The Royal
   * Society's, The Learned Chancery's, and the whole of Scientific's
   * Institutions line.
   *
   * An **empire building** is the user's name for the class (2026-09-17): a row
   * an empire may raise exactly once, wherever it chooses to raise it — the
   * Forum, the Caravanserai, the High Temple. The marker has always been on the
   * rows (`BuildingDef.oncePerEmpire`) and the evaluator has always divided its
   * two walks on it (`oneOfAKind`, which is that marker **or** a wonder); what
   * was missing was any way for a card to name the class.
   *
   * A member of its own rather than `hasBuildingYielding`'s `wonder` flag one
   * table over, and the difference is the whole point: a wonder is one per
   * *world* and an empire building is one per *realm*, so "the town that holds
   * my Forum" is a sentence about a choice this empire made and "the town that
   * holds the Pyramids" is a sentence about a race it won. `hasWonder` is the
   * other class and stays its own member; a card wanting either says `any`.
   *
   * Read off the marker alone and **never** off the wonder flag, which is why it
   * is not `oneOfAKind`: the Opus is an empire building by the data's own
   * declaration and a wonder is not, and a card that said "an empire building"
   * and quietly meant "or any marvel" would be paying for a class the player
   * did not choose. A town holding two counts once — it is a predicate, and
   * `CountKind`'s `empireBuildings` is what pays per house.
   */
  | {
      test: 'hasEmpireBuilding';
      /**
       * **And that house has stood at least this many turns** — Enduring
       * Institutions', and The Long Inheritance's second helping.
       *
       * `hasBuilding.standingTurns`' field one class over and the same reading,
       * asked of whichever of the town's empire buildings is **oldest**: a town
       * that raised its Forum forty turns ago and its Bourse last turn is a town
       * with an institution that has stood forty turns, which is what "a city
       * with an empire building at least twenty turns old" says. A boolean still,
       * so a town holding two admits once.
       */
      standingTurns?: number;
    }
  | { test: 'all'; of: CityScope[] }
  /**
   * **Any one of these** holds — the Stable's pasture *or* camp.
   *
   * The `all` composite's mirror, and it exists for one reason the union's own
   * docblock had not met: a **site** (`BuildingDef.requiresSite`) is a single
   * scope, so a row whose ground may be either of two things has nowhere to put
   * the second line. "A disjunction is two lines on a card and reads better as
   * two" is still true of a card's *clauses* — and a site is not a clause, it is
   * one question asked once in `buildError`.
   *
   * It stays as narrow as that argument: `all` and `any`, and still no `not`,
   * because a scope system that can say anything is a query language nobody can
   * print — the argument D2a re-ran and kept, written out on `notHasWonder`.
   * An empty list admits nothing, which is the honest reading of "any of
   * none" and the same answer `all` of none would give inverted.
   */
  | { test: 'any'; of: CityScope[] };

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
  /**
   * The empire has **spare** authority — its writ covers its cities with room
   * left over. Bread and Circuses' gate.
   *
   * `authorityNegative`'s mirror and a named member for `notFreshwater`'s
   * reason exactly: there is no `not` composite and there will not be one, so a
   * negation the ratified table actually asks for earns its own arm. Both read
   * the same total (`authorityOf`) under the same recursion cut, so an empire
   * sitting at exactly zero satisfies neither — balance is balance.
   */
  | { test: 'authorityPositive' }
  | { test: 'happinessNegative' }
  /**
   * A city of this empire has a row of this **category** in its queue —
   * Hemiunu's "while any city is building a wonder".
   *
   * A gate and not a scope, which is the distinction this union keeps: the
   * question is about *the empire* ("is anybody building one"), and the clause
   * it opens lands wherever the clause says it lands. `where: 'capital'`
   * narrows the sweep to the one town, because "the capital is building a
   * wonder" is a different sentence about the same board and a card that meant
   * it would otherwise have to say it with a scope on the wrong half.
   *
   * Read off `City.queue` through `queueCategory` — the one place a row is
   * sorted into a category — so a project, a wonder and a building are told
   * apart here by exactly the rule production tells them apart by.
   */
  | { test: 'queueHolds'; category: ProductionCategory; where?: 'any' | 'capital' }
  /**
   * **There is a war on** — The Arsenal Law's forges, which only run while
   * somebody is being shot at.
   *
   * Read off `state.wars`, the register itself (`wars.ts`), and that is the
   * whole of why it is honest: the wild is **never** in the register — a
   * barbarian has nothing to sign — so `atWar(state, x, y)` answering *true*
   * against raiders forever cannot leak in here, and a realm that has never
   * declared on anybody reads false however many camps it has burnt. A row per
   * unordered pair, so the question is "does any row name me".
   *
   * A gate and not a scope, which is the distinction this union keeps: war is a
   * fact about the *empire*, and the clause it opens lands wherever the clause
   * says it lands.
   */
  | { test: 'atWar' }
  /**
   * **Nobody is shooting at you** — The Long Peace's unpaid garrisons, Reserve
   * Officers' quiet half, and The Pageants of Peace.
   *
   * `atWar`'s mirror and a **named member** rather than a `not` composite: this
   * union has none and is not getting one, for the reason `CityScope`'s
   * `notHasWonder` spells out — the moment a gate can be any boolean tree it is
   * a gate nobody can print, and "while you are at peace" is a sentence a
   * player acts on where "while not (at war or …)" is not.
   *
   * Read off the same register (`state.wars`) and therefore with the same
   * honesty: the wild signs nothing and is never in it, so a realm that has
   * burnt a hundred camps and declared on nobody is at peace here — which is
   * what a card about peace means. The two arms are exact complements, so a
   * card carrying both halves covers every turn of the game and never both at
   * once.
   */
  | { test: 'atPeace' }
  /**
   * **A rite is burning somewhere in this realm** — The Rite of the Sky, whose
   * riders are bolder while the fires are lit.
   *
   * A gate and not a scope, which is the distinction this union keeps:
   * `CityScope`'s `keepingRite` asks whether *this town* is keeping one and
   * lands the clause in the towns that are, and this asks whether *anybody* is
   * and opens a clause that has nothing to do with a town at all — a strength
   * line on an army in the field, which no city scope could ever reach.
   *
   * Read through `cityRite` over this empire's towns, the one reading of "what
   * is this place keeping", so the gate closes on the turn the last rite's own
   * absolute expiry passes and nothing ticks (`TimedEffect`'s rule). The
   * condition is evaluated ignoring condition-gated effects (`conditionDepth`,
   * the one stated cut), which costs nothing here: a rite is stamped on a city
   * and no card can grant one by being read.
   */
  | { test: 'keepingRite' };

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
  /**
   * A city holding **this player's commercial post** stands on the contested
   * tile — Entrenched Interests, and the one card that reads a post without
   * reading its income (batch D2e).
   *
   * `inCity` with the owner test swapped for a post test, which is exactly what
   * the card says: *"in cities holding your trading post, including foreign
   * cities"*. So it admits your own towns where your house stands and a rival's
   * town where it stands too, and the soldier standing in the street is paid
   * either way.
   *
   * Read through `cityHoldsPost` (`routes.ts`) and deliberately **not** through
   * `cityPostPays`: the card's second sentence is *"going to war does not remove
   * these posts"*, and a strength line that went out the moment war started
   * would be the one line in the game that only works in peacetime. The
   * suspension is about income; this is about the factors who live there.
   */
  | { test: 'inCityWithPost' }
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
  | { test: 'fortified' }
  /**
   * The contested hex is within `hexes` of one of this player's **cities** —
   * Deborah under the palm, judging Israel within sight of her own people.
   *
   * `ownTerritory` said as a *distance* rather than as a border, and the two are
   * genuinely different questions: a border moves with culture and a march moves
   * with the army, so "near my towns" reaches ground nobody has claimed and
   * stops short of a colony's third ring. Measured by `wrappedDistance` off the
   * contested tile, exactly as every other radius in the game is.
   */
  | { test: 'withinOfCity'; hexes: number }
  /**
   * The piece on the **other** side is stronger than this one — Spartacus, and
   * the vocabulary's first comparison rather than a lookup.
   *
   * Base strength against base strength (`UnitDef.combatStrength`), not the folded
   * ledger: a line that read the fold would be a line inside its own sum, and
   * "attacking a stronger unit" is a fact about what the two pieces *are*. A
   * city has no strength of that kind and never satisfies it, for `vsClass`'
   * reason — nothing charges out of a town.
   */
  | { test: 'strongerTarget' }
  /**
   * The other side's empire holds **more cities than yours** — Spartacus, who
   * fought Rome and not a legionary.
   *
   * `strongerTarget`'s sibling one scale out, and the pair is the whole of what a
   * comparison in this union may ask: that one compares the two *pieces*, this
   * compares the two *realms*. Counted through `citiesOf`, the one town walk
   * every evaluator takes, so a town captured mid-war moves the line the turn it
   * changes hands — which is exactly the sentence the card makes ("the wider
   * empire"), rather than a snapshot of who was bigger when the war opened.
   *
   * The **wild** holds no cities and therefore never satisfies it, which needs no
   * clause: a realm of zero towns is not wider than a realm of one, and an empire
   * that has lost its last city is not one either. A city as the target has an
   * owner like any other piece, so storming a big neighbour's town counts.
   */
  | { test: 'vsWiderEmpire' }
  /**
   * A piece of this empire's matching `class` is **standing next to** the one
   * this line is being asked for — The Siege Train's engines, which are worth
   * something to the spearmen walking beside them.
   *
   * `CombatScaleCount`'s `adjacentFriendlies` asked as a *question* rather than
   * as a count, and narrowed by the ordinary `UnitFilter`: "is there an engine
   * here" and "how many friends are here" are two different sentences, and a
   * card that wanted the count would say `scaled`. Boolean, so three engines
   * beside one column pay once — which is what "standing beside a siege engine"
   * says.
   *
   * The ring of six off the piece's own hex, exactly as `adjacentFriendlies`
   * counts it, and combatants only for that count's reason: a worker parked next
   * door is not a formation.
   */
  | { test: 'beside'; class: UnitFilter }
  /**
   * **Every one of these** holds — The Siege Train's "against a city *and*
   * beside an engine".
   *
   * `CityScope`'s and `TileCondition`'s composite at the third scale, and here
   * for their stated reason exactly: `all` is the only composite there is and
   * there will not be an `or`, because a card whose condition could be any
   * boolean tree is a card nobody can print. A disjunction is two rows.
   */
  | { test: 'all'; of: CombatCondition[] }
  /**
   * The contested hex belongs to a city that **keeps this empire's faith** —
   * The Crusade, whose soldiers fight harder among their own congregation.
   *
   * `ownTerritory` asked of the *banner* rather than of the border, and the two
   * are genuinely different questions: a border says who collects the taxes and
   * this says who the people pray with. Read the way every other faith question
   * in this file is read — the hex's owning city, its derived `cityReligion`,
   * against the religions this empire is paid by (`heldReligions`, the holy
   * city's, so a conquered shrine moves the sentence with it) — so nothing here
   * can disagree with what the town flies.
   *
   * `foreign: true` narrows it to a town **somebody else owns**, which is the
   * half The Crusade's ratified text asks for ("inside foreign cities that
   * follow your religion"). Absent counts your own towns too, because a card
   * that meant the whole congregation should be able to say so.
   */
  | { test: 'followingTerritory'; foreign?: boolean };

/** What a strength line counts, when it counts something. */
export type CombatScaleCount =
  | 'cities'
  | 'adjacentFriendlies'
  /**
   * Great people of one **family** this empire has earned — The Empire's line
   * ("+1 combat strength for every great general earned this game").
   *
   * `CardPaysEffect.class`' sibling one table over, and the same bargain:
   * a count that needs an argument names it on the scale (`family`) rather than
   * in the union, so "per great general" and "per great engineer" are one arm.
   * *Earned*, not *held*: the sweep is `Player.legacies` — the people already
   * spent — plus this empire's pieces still standing, which between them are
   * every name it has ever been handed. A general who plants his citadel keeps
   * paying, which is what "earned this game" says.
   */
  | 'greatPeopleOfFamily'
  /**
   * Orders in a chair whose own flavour is the one named in `CombatScale.slot` —
   * The War Council, the deck-reader family's military member.
   *
   * `CountKind`'s member of the same name, asked of a *fight* rather than of a
   * ledger: the two unions share nothing but the word "count" (see
   * `combatScaleCount`), so a reader that pays strength and a reader that pays
   * yields each name the question in their own table. The reading is identical
   * and deliberately so — the card's own `OrderDef.slot`, never the chair's — so
   * the council a player can see on the Statecraft screen is the council that
   * shows up in the combat preview.
   */
  | 'slottedOrdersOfSlot'
  /**
   * **Great people's works standing in the capital's own lands** — Al-Ma'mun's
   * Camel Archer, whose arrows grow keener for every academy, manufactory and
   * citadel the House of Wisdom has planted around Baghdad.
   *
   * `greatPeopleOfFamily`'s sibling one step down the chain and deliberately a
   * different question: that one counts the *names* an empire has ever been
   * handed, and this counts the *stones* they left behind — a work pillaged, or
   * lost with the town that owned the hex, stops paying. Read off
   * `ImprovementDef.greatPerson` (presence is the marker), which is what
   * `TileCondition`'s `greatWork` reads one scale down, so the sixth work added
   * the day a great admiral lands joins this count with nothing touched.
   *
   * **The capital and no other town** (`docs/leaders.md`: "for every great
   * person improvement in your capital"), walked through `capitalCityOf` ×
   * `ownedTiles` — the one seat reading and the one town walk. That narrowness
   * is the design rather than an economy: it is what caps the line without a
   * `max` on the scale, it is what makes the choice of *where* to plant a work
   * a decision, and a work out in a colony or out in the wild belongs to no
   * count at all. A realm with no capital counts nothing, which is the honest
   * answer for an empire that has just lost its seat rather than a silence.
   */
  | 'capitalGreatWorks';

/** A strength line that scales with a count, capped where the design caps it. */
export interface CombatScale {
  count: CombatScaleCount;
  /** How many of the thing buys one helping. */
  per: number;
  /** The most it may ever be worth, in strength points. */
  max?: number;
  /** Which family `greatPeopleOfFamily` counts. Ignored by the other counts. */
  family?: Family;
  /**
   * Which flavour `slottedOrdersOfSlot` counts. Ignored by the other counts.
   *
   * `family`'s sibling one count over, and on the scale for that field's reason:
   * a count that needs an argument names it here rather than in the union, so
   * the union stays a list of questions.
   */
  slot?: SlotType;
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
  /**
   * **Any one of these silhouettes** — the Barracks' foot soldiers, which the
   * roster draws in two model classes (`melee` and `ranged`) and the user's tree
   * pass calls one thing: *"the spear, warrior and archer lines"*.
   *
   * `TileCondition`'s `anyFeature`/`anyImprovement` one table over, and here for
   * their reason exactly: the sentence names **one** kind of soldier the roster
   * happens to draw two ways, and there is no `or` composite in this vocabulary
   * — a filter that could be any boolean tree is a filter nobody can print. So a
   * list is the smallest honest thing to say.
   *
   * `modelClass` stays for the single-silhouette reading rather than being
   * folded into a one-element list: a row that means *one* silhouette says so,
   * four tables already spell it that way, and the describer prints the two
   * differently ("mounted units" against "melee and ranged units"). A row
   * carrying both must satisfy both, which is the reading every other pair of
   * narrowings on this shape takes.
   */
  modelClasses?: ModelClass[];
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
  /**
   * True: only the pieces an empire sends out to **look** — the ones that walk
   * anywhere at one point a hex (`isExplorer`). False: everything else.
   *
   * Wolf-Runners' scouts, and it is the roster's own marker for the reason
   * `consecrates` is: nothing in `src/sim/` compares a unit type against
   * `"scout"`, exactly as nothing compares against `"settler"` or `"augur"`, so
   * the commando a later age adds is quick under this card without the row being
   * touched.
   */
  explores?: boolean;
  /**
   * True: only the pieces an empire **levies, garrisons with and marches** —
   * `isFieldSoldier` (`unitData.ts`), Martial Law's count.
   *
   * The one member of this filter that says a thing the others cannot compose:
   * "a combatant that is neither a scout nor a hull" is three clauses and a
   * negation, and there is no `not` in this vocabulary and will not be — a
   * filter that can say anything is a filter nobody can print. So the roster's
   * own predicate earns a member, exactly as `consecrates` and `explores` did.
   *
   * It is deliberately the **rules'** reading and not a second one: the bot's
   * levy, its mix and its strike force have counted these pieces since 2026-09-05
   * and re-export the same function, so a card that pays for a garrison and a
   * bot that decides it has one cannot disagree about what a soldier is.
   */
  fieldSoldier?: boolean;
  /**
   * One **named** roster row, and nothing else — State Workforce's cheaper
   * worker (tree revision 4, 2026-09-02).
   *
   * The narrowest member of the filter and deliberately the last resort: every
   * other field asks what a piece *is*, so a card written against one of them
   * keeps meaning what it said when the roster grows. This one does not, which
   * is why it exists only for the case none of the others can reach — "workers"
   * as a *purchase* class is `{ modelClass: 'worker', consecrates: false }`
   * everywhere else in the game, and that phrase also admits the caravan, the
   * prophet and the inquisitor, three rows a discount on the spade has no
   * business touching.
   *
   * A card that could have used a silhouette and named a row instead is a card
   * that will quietly stop applying to the unit that replaces it; prefer the
   * fields above whenever one of them says the thing.
   */
  type?: UnitTypeId;
}

/**
 * What a tile must be for a line of yield to land on it.
 *
 * Declared here because Statecraft's hex `pays` was the first shape to need
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
  /**
   * **Any one of these features** stands here — The Unbroken Land's forest and
   * jungle, after the narrowing of 2026-09-03.
   *
   * `resource`'s shape one field over, and here for `resource`'s reason exactly:
   * the ratified text names *one* kind of ground ("the woods you have not
   * cleared") that the feature table spells as two rows, and there is no `or`
   * composite — `all` is the only one there is, deliberately, because a card
   * whose condition could be any boolean tree is a card nobody can print. So a
   * list is the smallest honest thing to say, and it composes under `all` with
   * `unimproved` the way the Hanging Gardens' farm composes with its water.
   *
   * `feature` stays for the single-feature reading rather than being folded into
   * a one-element list here: a row that means *one* feature says so, and the
   * describer prints the two differently ("forest hex" against "forest or
   * jungle hex").
   */
  | { test: 'anyFeature'; features: string[] }
  | { test: 'improved' }
  /**
   * **Any one of these improvements** stands here — The Stone Hoard's mine and
   * quarry (batch B2, the user's mark of 2026-09-08: *"a Mine **or** Quarry
   * carrying a resource"*).
   *
   * `anyFeature`'s shape one field over, and here for its reason exactly: the
   * ratified text names *one* kind of works ("the seams you have opened") that
   * the improvement table spells as two rows, and there is no `or` composite —
   * `all` is the only one there is, deliberately, because a card whose condition
   * could be any boolean tree is a card nobody can print. So a list is the
   * smallest honest thing to say, and it composes under `all` with
   * `hasResource` exactly as `unimproved` composes with `anyFeature`.
   *
   * `improvement` stays for the single-improvement reading rather than being
   * folded into a one-element list here: a row that means *one* works says so,
   * and the describer prints the two differently ("with a Mine", "with a Mine or
   * Quarry").
   */
  | { test: 'anyImprovement'; improvements: ImprovementId[] }
  /**
   * **Nothing has been built here** — `improved`'s mirror, and the whole home of
   * the 🌿 ladder (The Unbroken Land, The Greenwood Law).
   *
   * A named member rather than a sign on `improved`, for `notFreshwater`'s
   * reason exactly: there is no `not` composite and there will not be one, so a
   * negation the ratified table actually asks for earns its own arm. Asked of
   * `Tile.improvement`, where **presence is the state** — an unimproved hex is
   * one the field is simply absent from, so a pillaged farm becomes unimproved
   * ground again the turn the works come down, which is the reading the ladder's
   * cards want (leave the land alone and it pays you).
   */
  | { test: 'unimproved' }
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
   * A **mountain stands next door** — one of the hex's six neighbours is one.
   * Raised Fields' half of "farms beside a mountain feed better", where the farm
   * is an `improvement` condition and `all` is what makes them one line.
   *
   * `freshwater`'s exact shape and read the same way: off a **derived field on
   * the ground** (`Tile.mountainAdjacent`, baked once at generation), never off
   * a walk of the map here. That is not an optimisation dressed as a rule — this
   * predicate is asked millions of times a turn and holds a tile with no map
   * behind it, so a condition that needed the neighbours would have had to be a
   * second kind of condition with a second kind of caller. Mountains never move,
   * so the bake is correct for the life of the map.
   *
   * It is the tile scale of `CityScope`'s `mountainAdjacent`, and the two are
   * deliberately separate questions rather than one with a radius: that one asks
   * whether a *town* has a peak on its doorstep, and this asks it of a field.
   */
  | { test: 'adjacentMountain' }
  /**
   * The hex **pays this voice at all**, off its own ground — The Gilded Court's
   * "+1 science and +1 culture on every hex that yields gold".
   *
   * The one condition in the union that is not a fact about *what is on* the hex
   * but about *what the hex is worth*, and it is answered the only honest way
   * there is: by the breakdown the tile chain has already built. `explainTileYield`
   * hands its own entries in (`tileConditionHolds`' third argument, folded once
   * per hex and only when a condition asks), so "yields gold" means here exactly
   * what the hover card says the hex pays — terrain, hills, canopy, seam and
   * works — and a second implementation of the ground's arithmetic never comes
   * into existence. Rule 5 read at the scale of a question.
   *
   * **A caller that hands in no reading answers false**, which is
   * `CardRulePercentEffect.scope`'s bargain: a building's `tileYields` and a
   * luxury's `improvementYields` ask this predicate about a bare hex with no
   * breakdown behind them, and a condition nobody can be the subject of admits
   * nothing. That is the honest reading rather than an omission — a granary
   * cannot ask what a hex is worth, because what a hex is worth is partly the
   * granary.
   */
  | { test: 'yields'; yield: CityYieldKey }
  /**
   * The hex carries a **great person's work** — an academy, a landmark, a
   * manufactory, a customs house, a citadel.
   *
   * `improvement` asked of the *family* rather than of the row, and it reads the
   * marker the improvement table already carries (`ImprovementDef.greatPerson`,
   * presence is the marker) rather than a list of five names. So a sixth work
   * added the day a great admiral lands joins The Commonwealth's clause for
   * free, which is exactly why it is not the five-row `improvement` list a card
   * would otherwise have to spell out.
   */
  | { test: 'greatWork' }
  /**
   * **The work standing on this hex has stood at least this long** — The Old
   * Academy's ivy (batch D2d, the age stamp).
   *
   * The first condition in this union whose answer is a fact about *when* rather
   * than about *what*, and the one that needs the clock: a tile carries no
   * calendar, so `tileConditionHolds` takes a `turn` the way it takes the ring
   * and the fold — from whoever has it — and a caller with no clock answers
   * **no**, which is `yields`' and `beside`'s bargain exactly.
   *
   * Read off `Tile.improvedOn` through `improvementAge` (`map.ts`), an absolute
   * stamp subtracted from the turn, so **nothing ticks**. Bare ground and ground
   * whose stones carry no stamp both answer no — "cannot be shown to be old
   * enough" rather than "new" — and a work torn up and rebuilt starts again,
   * because the stamp goes with the improvement it is a fact about.
   *
   * It says nothing about *which* work stands there: a card that means an academy
   * says `all` of this and `improvement`, which is how every other narrowing in
   * this union composes. Inclusive, `populationAtLeast`'s reading.
   */
  | { test: 'standingSince'; turns: number }
  /**
   * **A road runs through this hex** — Market Gardens' farms, which are worth a
   * coin because the cart can reach them.
   *
   * `Tile.road` and nothing else, which is the one field a road is ever written
   * on (`layRoad`, `roads.ts`). **Presence, never the builder**: this predicate
   * holds a tile and no empire — it is handed to a granary and to a luxury as
   * well as to a card — so "whose road" is a question it cannot ask, and a
   * clause that pretended to would be answering about the reader rather than
   * about the ground. A road on your own hex is in practice yours or an ally's;
   * a rival's road inside your borders is a road your carts can use too.
   *
   * Absence is the state, `unimproved`'s reading of the same kind of field, so
   * a hex whose road was never laid simply says no.
   */
  | { test: 'road' }
  /**
   * **One of the six hexes touching this one satisfies that** — Market Gardens'
   * farms beside a road, The Sculpted Landscape's fields beside a master's
   * work.
   *
   * The one member of this union whose answer is a fact about ground the
   * predicate does not hold, and it is answered the only honest way there is:
   * **the caller hands in the ring**. `TileCondition` is a tile and no map by
   * construction (see the union's own docblock and `adjacentMountain`'s, which
   * bakes its answer onto the ground precisely because mountains never move),
   * and roads, woods and works all move — so the ring cannot be baked and a
   * second kind of condition with a second kind of caller would have been the
   * price. Instead `tileConditionHolds` takes a fourth argument, a thunk for
   * the neighbours, exactly as `yields` takes one for the breakdown; the yield
   * chain supplies it from `TileYieldContext.neighbours`, and **a caller that
   * hands in no ring answers no** — `yields`' own bargain, taken for its reason.
   *
   * It is a **composite over the union** rather than three named members
   * ("beside a road", "beside a forest", "beside a work") because the ring asks
   * the same question the hex asks: the six neighbours are hexes, and every
   * predicate that reads a hex already exists. So "beside an unimproved forest"
   * is this member over `all`, and nothing new is written the day a card wants
   * "beside a quarry".
   *
   * **A `beside` inside a `beside` answers no.** The ring is not re-supplied to
   * the inner evaluation, so the reach is exactly one hex and cannot become a
   * flood fill — a rule the type could not express and the cost of the walk
   * makes worth stating. The hex's own breakdown is not handed down either: a
   * neighbour's worth is not this hex's, and `yields` asked of a neighbour
   * answers no for the same reason a bare caller's does.
   */
  | { test: 'beside'; of: TileCondition }
  /**
   * Every one of these holds. `CityScope`'s composite, one scale down, and here
   * for its reason: a wooded tundra and a mine standing on a luxury are single
   * conditions in the ratified text and two questions about one hex.
   */
  | { test: 'all'; of: TileCondition[] };

// --- the counts -------------------------------------------------------------

/** What `basis: 'count'` counts. Each has exactly one arm in `countOf`. */
export type CountKind =
  /** Distinct luxuries the empire controls. `controlledResources`. */
  | 'uniqueLuxuries'
  /** Improved luxury *copies* — duplicates count. `resourceCopies` summed. */
  | 'luxuryCopies'
  /**
   * Luxuries the empire controls **two or more copies of** — Village Fairs, and
   * the count that makes a surplus worth something.
   *
   * `uniqueLuxuries` and `luxuryCopies` are the two ends of the same sweep (how
   * many kinds, how many seams) and this is the middle one neither can say: it
   * counts *kinds*, but only the kinds there is more than one of. A member of
   * its own rather than a threshold argument on `luxuryCopies`, for
   * `improvedStrategicResources`' reason — the three read differently on a card
   * and a member each is what lets `COUNT_WORDS` write the words.
   */
  | 'duplicateLuxuries'
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
  /**
   * Citizens living in this empire's **puppets** — Tribute's, and the tax a
   * conqueror takes instead of taking a town into the realm proper.
   *
   * `population` narrowed to the towns that chose nothing for themselves
   * (`City.puppet`, the flag `annexCity` deletes), and a member of its own
   * rather than a filter on that count for `improvedStrategicResources`' reason
   * exactly: "per citizen" and "per citizen in a puppet" read differently on a
   * card, and a member each is what lets `COUNT_WORDS` write the words. It is
   * **never** narrowed by `within: 'city'` — a puppet spends nothing, so a line
   * paid *in* one would be a payout the town could not use; the tribute is the
   * realm's, which is the whole sentence the card makes.
   */
  | 'puppetPopulation'
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
  // `chargedAugurs` — augurs standing in this city with a rite left in them —
  // was retired here on 2026-09-06 with the augur itself (`data/units.json`'s
  // row is `retired`, so nothing on any board can ever be charged and the count
  // could only answer zero). Court Augurs is re-cut to read *cities with an
  // active rite* (`docs/history/fewer-things.md` §3), which is a different count and
  // will be added as one. A member no row names and no board can satisfy is a
  // vocabulary entry that reads as a feature.
  /**
   * Buildings in **this city** that supply science at all (city-scoped) — a
   * library, a shrine, a university. Omen Reading's, read off the building rows
   * so a retune moves the rite with it.
   */
  | 'scienceBuildings'
  /**
   * Buildings of **one named kind** the empire holds — one per city that has
   * built it. The effect names which in `CardPaysEffect.building`.
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
   * Hexes **this city** is working that nobody has built anything on
   * (city-scoped) — The Quiet Fields', and the 🌿 ladder's one clause that is
   * about labour rather than about ground.
   *
   * `workedHills`' shape exactly, asked of `TileCondition`'s `unimproved`
   * question instead of of the shape of the land: `City.workedTiles`, the city
   * centre excluded as the assigner counts them, keeping only the hexes whose
   * `improvement` is absent. A member of its own rather than a filter argument
   * on `workedTilesInCity`, for `improvedStrategicResources`' reason — the two
   * read differently on a card ("per hex worked here", "per unimproved hex
   * worked here") and a member each is what lets `COUNT_WORDS` write the words.
   */
  | 'workedUnimprovedTiles'
  /**
   * **Wonders** standing in this empire's cities — Phidias' and Dürer's.
   *
   * `buildingsOfKind` without the argument, and a count rather than a widening
   * of that one because "a wonder" is a class the data already declares
   * (`BuildingDef.wonder`, read by `isWonder`) while `buildingsOfKind` names one
   * row. A wonder is one per world, so counting across the empire's towns is
   * exact — and a wonder that changes hands changes this count with it, which is
   * the wonders framework's own rule (what a wonder *pays* follows the stones).
   *
   * **Narrowed to one town by `within: 'city'`** (batch L3c): the Valley of
   * Kings is paid for the great houses standing in its own valley and not for
   * the realm's. The same narrowing `improvedBonusResources` takes, and for its
   * reason — it is the same sweep, asked of different ground.
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
   * Great people this empire has **called** — the House of Learning's, and the
   * doc's own sentence (`docs/leaders.md`: *"+1 science for every great person
   * you've recruited"*).
   *
   * `Player.greatPeopleRecruited`, which is the count kept where a person is
   * *picked* rather than where it is spent — so a house that learnt from the
   * scholar goes on learning from her after the academy is planted and the
   * piece is gone, which is what "the realm has called" means. Nothing lowers
   * it, so a card written on it can never be farmed by spending one.
   *
   * Deliberately not `legacies.length` and not a walk of the living pieces, for
   * the field's own stated reason: a person is recruited when it is picked and
   * leaves its legacy only when it is spent, and an empire holding an unspent
   * great person has already paid for it.
   */
  | 'greatPeopleCalled'
  /**
   * This empire's **living pieces**, narrowed by `CardPaysEffect.class`.
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
   * (`CardPaysEffect.category`): where that count names *one row*, this
   * names what a row is *for* (`BuildingDef.category`, the one word every
   * building declares). The Merchant League's "+1 gold for every gold-producing
   * building" is one line of it, and a second gold building is a JSON row rather
   * than an edit here — which is exactly why the category and not a list.
   */
  | 'buildingsOfCategory'
  /**
   * Buildings somebody **bought** rather than built — The Endowment's, counted
   * across the realm and narrowed to one town by `within: 'city'` (batch C8).
   *
   * `buildingsOfCategory`'s sibling asked about provenance instead of purpose.
   * Read off `City.buildingBanks`, which is written only by `addBuilding` at the
   * moment the till rings, so the count is of roofs an empire actually paid for
   * at a counter — a completion, a card's grant, a founding Monument and a relic
   * are all uncounted, and no reading afterwards could have told them apart.
   *
   * **Which bank is deliberately not asked.** The card says "purchased", and a
   * library bought with faith is as bought as one bought with gold. A row that
   * wanted one bank would be a narrowing on this member, not a second member.
   *
   * A captured town brings its record with it, exactly as it brings its dates:
   * a conqueror who takes a town of bought roofs is paid for them, which is what
   * pay-follows-the-stones already means everywhere else.
   */
  | 'purchasedBuildings'
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
  | 'tradeRoutes'
  /**
   * Trade routes this empire runs whose **partner belongs to somebody else** —
   * Marco Polo's road to Khanbaliq.
   *
   * `tradeRoutes` narrowed by who owns the far end, and a member of its own for
   * `followingForeign`'s reason exactly: the two read differently on a card
   * ("per trade route you run", "per trade route to another empire") and a
   * member each is what lets the words be written without a second table. The
   * far end is read off the board each turn (`TradeRoute.to` resolved through
   * `cityById`), so a partner that changes hands changes the count with it.
   *
   * **Narrowed to one town by `within: 'city'`** (batch C5): the foreign routes
   * that set out from *that* town, which is The Cosmopolitan Court's count.
   * Departing rather than arriving is the only reading the narrowing can have —
   * a foreign route this empire runs ends in somebody else's town, so "arriving
   * at one of my own" would be nought everywhere. `tradeRoutes` and
   * `internalTradeRoutes` take no such narrowing: both ends of a domestic route
   * are this empire's, so a town scale would have to pick a direction, and no
   * card has asked yet.
   */
  | 'foreignTradeRoutes'
  /**
   * **Foreign towns holding this empire's paying commercial post** — The Foreign
   * Factor's *"each foreign city holding your established commercial post"*
   * (batch D2e).
   *
   * Foreign by construction rather than by a field: every card that counts posts
   * is counting the ones abroad, because a house in your own province is a thing
   * the `holdsPost` scope admits a town *for* and not a thing an empire tallies.
   * If a card ever wants its own, that is a second member and a second sentence.
   *
   * Through `cityPostPays` (`routes.ts`), so the count and the town scope agree
   * about which posts are live: a post suspended by war or by a blockade is not
   * counted, exactly as it is not paid. That is what makes The Foreign Factor's
   * two halves one card — the coin it takes and the coin it gives out are
   * counting the same houses.
   */
  | 'postCities'
  /**
   * Trade routes this empire runs whose **partner is one of its own towns** —
   * The Provisioners' grain, which never leaves the realm.
   *
   * `foreignTradeRoutes`' mirror over the same sweep, and a member of its own
   * for that count's reason exactly: the two read differently on a card ("per
   * trade route to another empire", "per trade route between your own cities")
   * and a member each is what lets `COUNT_WORDS` write the words without a
   * second table. The far end is resolved off the board every turn, so a partner
   * that changes hands moves from one count to the other with it.
   */
  | 'internalTradeRoutes'
  /**
   * The Orders this empire has placed in a slot — The Archives, for which
   * every law on the books is a shelf longer.
   *
   * Read off `PlayerStatecraft.slots`, which is the same table
   * `windfallRider`'s `perSlottedOrder` reads: that flag multiplies a payout by
   * how many chairs are filled, and this pays per chair. It counted the
   * *levels* of those cards until the levelling ruling of 2026-09-04, which
   * left the word nothing to mean — a card is held once now, so a full council
   * is a count of chairs.
   */
  | 'slottedOrders'
  /**
   * Orders this empire holds and has **not** placed in a slot — The Annals of
   * Law, for which the laws you chose not to pass are also history.
   *
   * `slottedOrders`' opposite number, over the shelf rather than the chairs:
   * the card is about the archive, and an archive is what was decided and not
   * enacted as much as what was.
   */
  | 'unslottedOrders'
  /**
   * Orders sitting in a chair whose own **flavour** is the one named in
   * `CardPaysEffect.slot` — the deck-readers (The Guild Charter's
   * economic cards, The Synod's wildcards).
   *
   * `slottedOrders` counts how *full* the council is and this counts what kind
   * of council it is, which is the whole of what a deck-reader asks: a
   * draft stops being a shopping trip the moment a card is worth more beside its
   * own kind. It takes its argument on the effect exactly as `buildingsOfKind`
   * does, so "per military Order" and "per wildcard Order" are one arm, one
   * table entry and three data rows.
   *
   * **The card's own flavour, not the chair's** (the user's Senatus, verbatim:
   * *"not a wildcard slot filled, a wildcard card that is active"*). A wildcard
   * chair takes any card, so counting chairs would have paid a military empire
   * for its spearmen under a wildcard heading. Read off `OrderDef.slot` for
   * every card in `PlayerStatecraft.slots`, which means a deck-reader **counts
   * itself** — that is deliberate, and it is what makes the floor of the card
   * one helping rather than nothing at all.
   */
  | 'slottedOrdersOfSlot'
  /**
   * Barbarian camps this empire has **burnt out**, across the whole game — The
   * Last Hunt's tally.
   *
   * `discoveredCamps` counts what is still standing on ground you have walked;
   * this counts what is no longer standing because you rode it down, so it only
   * ever rises. It is the one count in the union answered off a *record* rather
   * than off the board (`Player.campsCleared`) — a cleared camp leaves nothing
   * behind to sweep, which is exactly what clearing one means — and the record
   * is written at the single seam that clears one (`arriveOnTile`).
   */
  | 'clearedCamps'
  /**
   * Wonders standing **anywhere in the world**, yours and everybody's — The
   * Grand Tour's "seen or not".
   *
   * `wonders` counts what this empire holds; this counts what the age has
   * raised. Read off `GameState.wonders`, the claim register, which is the one
   * place a wonder is written down and never moves — so the count is exactly
   * "how many marvels exist", with no fog clause and nothing to sight. The two
   * are separate members for `followingForeign`'s reason: they read differently
   * on a card, and a member each is what lets the words be written.
   */
  | 'worldWonders'
  /**
   * Cities **in the world** that follow the religion this empire founded —
   * yours and everybody's.
   *
   * The tide, counted. The five counts below are one family and they are all
   * asked of `foundedReligion(state, playerId)`: an empire that has founded
   * nothing counts nothing, which is the honest answer rather than a guard. They
   * sweep `state.cities` (founding order) and read `cityReligion`, which is
   * derived from the citizens — so nothing here can disagree with the banner.
   */
  | 'followingCities'
  /**
   * Following cities **somebody else owns** — the founder's trickle's own count.
   *
   * `followingCities` minus your own towns, and a member of its own rather than
   * a flag for `sightedCities`' reason exactly: the two read differently on a
   * card ("per following city", "per foreign following city") and a member each
   * is what lets the words be written without a second table.
   */
  | 'followingForeign'
  /** Citizens summed across every following city, yours and foreign. */
  | 'followingPop'
  /**
   * Citizens summed across the following cities **somebody else owns** —
   * Pilgrims', whose whole subject is the congregation beyond your own borders.
   *
   * `followingPop` is to `followingCities` what this is to `followingForeign`,
   * and it is a member of its own for that count's stated reason: "per citizen
   * who follows you" and "per foreign citizen who follows you" read differently
   * on a card, and a member each is what lets the words be written without a
   * second table. Answered by the same sweep, which is what keeps the four
   * readings of the tide from disagreeing about who is in it.
   */
  | 'followingForeignPop'
  /** Empires with at least one following city. The reach of the faith. */
  | 'followingEmpires'
  /**
   * Following cities that have raised one **named** building — the effect says
   * which in `CardPaysEffect.building`, exactly as `buildingsOfKind`
   * does. Pilgrims' Coin's temples.
   */
  | 'followingWithBuilding'
  /**
   * Following cities that hold **at least one wonder** — Marvels of the Faith's,
   * and the tide counted by where the age's marvels stand.
   *
   * `followingWithBuilding`'s sibling with the class in place of the name, and a
   * member of its own for `wonders`' reason exactly one scale out: "a wonder" is
   * a class the data already declares (`BuildingDef.wonder`, read by `isWonder`)
   * while that count names one row, and "per following city with a Temple" and
   * "per following city that holds a marvel" read differently on a card. It is
   * a count of **towns**, not of wonders: a city holding three marvels is one
   * helping, which is what "every city in the world that follows you and holds a
   * wonder" says.
   *
   * Read off the town's own `buildings` list rather than off `state.wonders`,
   * which is the wonders framework's own rule — the claim register is history
   * and what a wonder *pays* follows the stones — so a marvel that changes hands
   * moves this count with it.
   */
  | 'followingCitiesWithWonder'
  /**
   * Buildings of **one category** standing in following cities, world-wide —
   * The Scriptoria's faith houses.
   *
   * `buildingsOfCategory` asked of the tide instead of of the realm, and a
   * member of its own rather than a `following` flag on that count for
   * `improvedStrategicResources`' reason exactly: the two read differently on a
   * card ("per faith building", "per faith building in a city that follows
   * you") and a member each is what lets `countNoun` write the words. Which
   * shelf is `CardPaysEffect.category`, exactly as `followingWithBuilding` names
   * a row in `building`; a line naming no category counts nothing at all, which
   * is the honest answer for a question that never said which buildings rather
   * than a guard that would quietly count every roof in the world.
   *
   * A count of **buildings**, not of towns: a following city with a shrine and a
   * temple in it is two helpings, which is the whole difference between this and
   * the count above it.
   */
  | 'followingBuildingsOfCategory'
  /**
   * Citizens of **this city** who follow the religion this city follows
   * (city-scoped) — the Cathedral's Scholars' Crypt and Eternal Flame.
   *
   * The `following…` family's opposite number, and a member of its own for that
   * family's reason exactly: those five are questions about a *founder* answered
   * across the world, and this is a question about **one town** answered off its
   * own `followers` count. A city that follows nothing counts nothing, which is
   * the honest answer rather than a guard — the banner is derived from the
   * citizens (`cityReligion`), so this cannot disagree with what the town flies.
   */
  | 'followersHere'
  /**
   * **What this card has watched happen** — the growing cards' counter
   * (`docs/history/doctrine-ideas.md`, "Growing cards", ruled 2026-09-04).
   *
   * Every other member of this union is a question the board answers *now*: ask
   * it twice and it says the same thing, because the luxuries, the citizens and
   * the wonders are all still standing there to be counted. This one is the
   * opposite kind of question — it counts **occasions**, which are moments and
   * are gone — so what it reads is the tally the empire has been keeping for
   * this very card (`PlayerStatecraft.tallies`, written by
   * `recordScalingOccasion`).
   *
   * It is one member and not five because the difference between The
   * Ballad-Weavers and The Bell-Founders is *which* occasion, and an occasion is
   * an argument: `CardPaysEffect.tally` names it, exactly as `building`
   * names a building and `slot` a flavour. So a sixth growing card is a JSON row.
   *
   * The counter belongs to the **card**, not to the occasion, which is what lets
   * two cards watch one moment and each keep its own count — and it grows only
   * while the card is in a slot (the standing ruling: the bench is never
   * productive, and nothing is retroactive).
   */
  | 'tally'
  /**
   * **Hexes this empire has laid a road on** — The Long Roads', and the one
   * shape the cards pass of 2026-09-05 was allowed to add.
   *
   * Read off `Tile.road`, which is written by `layRoad` and by nothing else, so
   * the count is the *builder's* mark: a road a rival's culture has since grown
   * over is still a road this empire paved, and a road nobody paved is not a
   * road. That is deliberately not the ratified text's "inside your borders to
   * its nearest city" — a payout routed to a particular town would need a
   * second answer to "which town is nearest", and the borders move under a road
   * that does not — so the row prints what it counts and the doc's notes say
   * what it stopped saying.
   *
   * An **index sweep** over `map.tiles`, `revealedTiles`' shape exactly: four
   * thousand field reads with no address arithmetic, which is the only reading
   * a whole-map count can afford. `roadFree` hexes count — a decreed road is a
   * road, and only the *maintenance* ledger cares who is billed for it.
   */
  | 'roadHexes'
  /**
   * Buildings of **two or more categories at once** — The Long Count's science
   * *and* faith houses.
   *
   * `buildingsOfCategory` with a list where that one has a word, reading
   * `CardPaysEffect.categories`, and a member of its own rather than a
   * widening of that field for `improvedStrategicResources`' reason exactly: the
   * two read differently on a card ("per gold building", "per science or faith
   * building") and a member each is what lets `COUNT_WORDS` write the words
   * without a second table. A row naming no list counts nothing at all, which is
   * the honest answer for a question that was never asked rather than a guard
   * that would quietly count every building in the realm.
   */
  | 'buildingsOfCategories'
  /**
   * **What this empire's books say it makes in one voice, this turn** — Horology's
   * "science equal to your empire-wide production", and the Long Count's kin.
   *
   * The one count in the union whose subject is the ledger rather than the board,
   * and it is answered by the ledger's own reading (`foldEmpireRates`,
   * `cities.ts`) rather than by a second sweep of the towns — the same bargain
   * `pays` rate strikes one shape over, widened to all six voices because a
   * periodic boon may be quoted in hammers and a rate never was.
   *
   * **It cannot feed itself**, and that is a stated cut rather than an accident:
   * while the empire's books are being computed, this count answers nothing
   * (`rateDepth` in `statecraft.ts`, `conditionDepth`'s idiom one question over).
   * A card that paid gold for the gold it makes would otherwise be a loop with no
   * answer — the share basis' first clause, at empire scale.
   *
   * Which voice is `CardPaysEffect.voice`; a row naming none counts
   * nothing.
   */
  | 'empireYield'
  /**
   * **Order drafts this empire has rerolled while this card sat in its chair** —
   * the shrine engine of `docs/history/orders-pass-3.md` §9 ("+1🕯 on Shrines for every
   * faith roll while this Order is slotted").
   *
   * `tally`'s cousin and deliberately not a `TallyOccasion`: a tally belongs to
   * the *card* and survives the bench (`PlayerStatecraft.tallies`), and this one
   * belongs to the **chair** — the count is what this placement has watched, so
   * benching the card and slotting it again starts a new watch. That is the
   * ruling read literally ("while this Order is slotted") and it is why the
   * counter is `SlottedOrder.rerollsSeen` rather than a row of the tally table.
   *
   * **Nothing writes it yet.** The reroll verb is batch C1's
   * (`docs/fewer-things-plan.md`); the field is declared here so that batch only
   * has to increment it, and until it does this count reads nought in every
   * empire — which is the honest answer for a thing that has not happened.
   */
  | 'rerollsWhileSlotted'
  /**
   * **Other empires this seat has a live road to**, counted once each — Ibn
   * Baṭṭūṭa, whose worth is the number of courts he reached and not the number of
   * times he set out.
   *
   * `foreignTradeRoutes` counts *caravans*; this counts **partners**, and the two
   * are a member each for `internalTradeRoutes`' reason exactly: three roads to
   * one neighbour read differently on a card from three roads to three, and the
   * whole of what a card about the wider world means is the second one. The sweep
   * is `foreignTradeRoutes`' — the board's own caravans, the far end resolved
   * fresh every turn — with the partner's *owner* remembered rather than tallied,
   * so a rival that changes hands moves the count with it.
   *
   * An array of seat ids walked and searched, never a `Set`: this is an outcome,
   * and nothing in this game iterates a keyed collection for one.
   */
  | 'tradePartnerEmpires'
  /**
   * **The writ this empire is not using** — capacity less what its cities spend,
   * floored at nothing (Gracia Mendes Nasi, whose fortune was what the treasury
   * did not need).
   *
   * `EmpireCondition`'s `authorityPositive` said as a *figure* rather than as a
   * gate, and read off the same fold (`explainAuthority` through `authorityOf`),
   * so the meter's own sheet and the card's helpings cannot disagree by a point.
   * Floored at nothing because the sentence is "spare", and an empire in deficit
   * has no surplus to be paid for — a card that paid for the shortfall would be a
   * card that rewards over-reach.
   *
   * **It cannot feed itself**, and the cut is stated rather than hoped for: a row
   * paying `to: 'authority'` off this count would ask the meter for the answer it
   * is helping to compute, so while the writ is being folded this count answers
   * nothing (`meterDepth`, `rateDepth`'s idiom one meter over).
   */
  | 'authoritySurplus'
  /**
   * **Every coin this empire has ever spent buying something** — Cosimo de'
   * Medici, paid for the habit rather than for the purse.
   *
   * `bankedGold` counts what is *in* the treasury; this counts what has gone out
   * of it, and the two are a member each because they read opposite ways: a realm
   * that spends is poor by the first count and rich by this one, which is the
   * whole of what the card is about.
   *
   * Read off `Player.goldSpent` — a **record**, `clearedCamps`' reason exactly:
   * coin that has left the treasury leaves nothing on the board to sweep. It is
   * written at the seams where a *player's own act* takes gold out for a thing
   * (see that field), and nothing lowers it.
   *
   * Not `TallyOccasion`'s `goldSpent`, which is the same moment written down for a
   * different holder: a tally belongs to a **card in a chair** and grows only
   * while it sits there, and a legacy sits in no chair at all. Two records of one
   * moment, each answering the question its own holder can ask.
   */
  | 'goldSpent'
  /**
   * **How long one road is, in hexes** — Marco Polo, paid by the mile.
   *
   * The one count in this union asked of a *route* rather than of an empire or a
   * town, and it is answered only where a road is in hand: `where: 'route'`, in
   * the caravan's own fold (`routeYields.ts`), which is the module that holds
   * both ends. Every other reader answers nothing, exactly as a city-scoped count
   * answers nothing to a caller with no town.
   *
   * **The distance between the two towns, not the path the cart walks**
   * (`routeHexes`, `routes.ts`). A walked path shortens every time somebody paves
   * a hex and lengthens when a border closes, so a card written on it would pay a
   * different figure every turn for the same road and the send preview could not
   * promise what the route would earn. The distance is a fact about the pair, is
   * the figure the Trade screen can print before a caravan exists, and is the
   * same for a route running and a route being considered.
   */
  | 'routeLength'
  /**
   * **Towns this empire took rather than founded** — Imperium's, whose whole
   * subject is the realm built by conquest.
   *
   * `cities` narrowed by `City.captured`, the sticky flag that says *whether
   * ever* (a town founded and lost and retaken is captured; a town raised from
   * nothing never is), and a member of its own rather than a scope on that count
   * for `improvedStrategicResources`' reason exactly: "per city" and "per
   * captured city" read differently on a card, and a member each is what lets
   * `COUNT_WORDS` write the words.
   *
   * It counts what this empire **holds now**, not what it has ever taken: a town
   * lost back is somebody else's count the turn it changes hands, which is what
   * "each captured city you hold" says and the only reading a card about an
   * empire's extent could honestly have.
   */
  | 'capturedCities'
  /**
   * **The realm's single great houses** — The Royal Society's, and the count
   * `CityScope`'s `hasEmpireBuilding` pays per house rather than per town.
   *
   * `wonders` one class over: that count reads the class the *world* allows one
   * of and this reads the class a *realm* allows one of
   * (`BuildingDef.oncePerEmpire`, the marker `oneOfAKind` has always divided the
   * two building walks on). Two counts because the two read differently on a
   * card, and because the same town may hold one of each.
   *
   * A count of **buildings**, and by construction also a count of the rows this
   * empire has finished: one per kind is all there can ever be. Narrowed to one
   * town by `within: 'city'`, `wonders`' own narrowing and for its reason — the
   * same sweep, asked of different ground. Read off the towns' own `buildings`
   * lists, so pay follows the stones exactly as a wonder's does and a captured
   * Forum is its captor's from the turn the town changes hands.
   */
  | 'empireBuildings'
  /**
   * **Different kinds of strategic seam this empire can draw on** — The Assay's,
   * and the first of the five *distinct-kind* counts (D2b).
   *
   * `improvedStrategicResources` counts *seams* and this counts **kinds**, which
   * is the pair `uniqueLuxuries` and `luxuryCopies` already are one resource
   * class over — and a member each for that pair's reason: "per improved
   * strategic resource" and "per different kind of strategic deposit" read
   * differently on a card, and the second is the sentence a card about breadth
   * means. Answered by `controlledResources(…, 'strategic')`, the same reading
   * `uniqueLuxuries` takes, so the two resource classes cannot disagree about
   * what "controlled" means.
   *
   * **Access, not ownership**: a seam a card cannot name pays nothing anywhere
   * (`resourceIsVisibleTo`), and that reading is inside the sweep rather than
   * beside it.
   */
  | 'uniqueStrategicResources'
  /**
   * **Different kinds of wild ground this town's citizens work** (city-scoped) —
   * The Naturalists', who are paid for the variety and not for the acreage.
   *
   * `workedTilesInCity`'s shape with the *kinds* counted instead of the hexes:
   * `City.workedTiles`, the city centre excluded as the assigner counts them,
   * keeping each distinct `Tile.feature` once. Bare ground counts nothing at all
   * — `'none'` is the table's empty value rather than a kind of wild, and open
   * plain is the absence of a feature rather than one more of them.
   *
   * A member of its own rather than a flag on `workedTilesInCity`, for
   * `workedUnimprovedTiles`' reason exactly: the two read differently on a card
   * and a member each is what lets the words be written.
   */
  | 'distinctWorkedFeatures'
  /**
   * **Different kinds of great-person work this town's citizens stand on**
   * (city-scoped) — The Great Exhibition's, and The Academy Quarter's.
   *
   * `distinctWorkedFeatures`' twin one layer of the ground up: the same walk of
   * `City.workedTiles`, keeping each distinct `Tile.improvement` once and only
   * where the improvement table marks it a great person's
   * (`ImprovementDef.greatPerson`, presence is the marker — the very declaration
   * `TileCondition`'s `greatWork` reads). So the sixth work added the day a great
   * admiral lands joins every card written on this for free.
   *
   * `CityScope`'s `workingGreatWork` is the predicate over the same ground and
   * stays its own member: that one admits a town for working any, and this pays
   * per *kind*, which is the whole difference The Great Exhibition's two clauses
   * are made of.
   */
  | 'distinctWorkedGreatWorks'
  /**
   * **Different shelves of building this town has raised** (city-scoped) — The
   * Complete Court's, paid for the breadth of what a capital keeps.
   *
   * `buildingsInCity` counts the roofs and this counts the **kinds of roof**:
   * the town's own `buildings` list, keeping each distinct `BuildingDef.category`
   * once. Wonders and empire buildings are in it, exactly as they are in
   * `buildingsInCity`, because a marvel is a building and the court is paid for
   * what the town has raised.
   *
   * The shelf is the data's own word, so a category added to the table widens
   * every card written on this without an edit here — `buildingsOfCategory`'s
   * bargain, counted the other way round.
   */
  | 'distinctBuildingCategories'
  /**
   * **Different great-person families whose legacy this empire still holds** —
   * The Living Canon's, and The Inherited School's.
   *
   * The distinct-kind reading of `Player.legacies`, which is the register a
   * spent great person leaves behind (`LegacyRecord`, revoked by **marking**).
   * A revoked legacy is not held, which is the whole meaning of the mark, so the
   * count falls the turn one is revoked and a card written on it cannot be
   * farmed by a legacy the realm no longer keeps.
   *
   * **Families, not legacies**: three scholars leave three legacies and one
   * family, and "the variety of legacies you hold" is a sentence about the five
   * families rather than about the roster. `greatPeopleCalled` is the other
   * count of the same people and stays its own member — that one counts how many
   * were ever picked and this counts how many kinds still pay.
   */
  | 'legacyFamilies'
  /**
   * **Shelves this empire's towns have opened** — The Chronicle of Works', one
   * line for every time a town raised its first building of a kind.
   *
   * The first count in the union answered off `GameState.firsts` rather than off
   * the board or off a card's own books, and that is the whole of what the
   * ledger is for: "a culture building you complete **for the first time** in a
   * city" is a fact about what has already happened, and nothing standing
   * anywhere can be asked it — a town that raised a Monument and lost it to a
   * conqueror still opened the shelf.
   *
   * Narrowed by `CardPaysEffect.category` to one shelf, exactly as
   * `buildingsOfCategory` is and for its reason: "per culture building" and "per
   * faith building" are one entry in the words. A row naming no category counts
   * every shelf every town has opened, which is the honest reading of an unnamed
   * argument rather than a guard.
   *
   * It is **never** narrowed by `within: 'city'`: the record is the realm's, the
   * card is paid in the capital, and a line paid per town would count the same
   * chronicle once in every town that has one.
   */
  | 'firstBuildingsInCity'
  /**
   * **Foreign towns this empire's faith reached first** — The Living Hymnal's.
   *
   * `firstBuildingShelves`' sibling, off the same ledger and a member of its own
   * for that count's reason: the two read differently on a card and a member
   * each is what lets the words say so. A *foreign* town, decided where the
   * record is written (`bankPressure`) and never re-derived here — a town
   * converted while it was somebody else's and taken a decade later is still a
   * verse the hymnal wrote first.
   */
  | 'firstConversions'
  /**
   * **Hexes inside this empire's borders that satisfy `CardPaysEffect.tile`** —
   * Ore Caravans' mines, Luxury Caravans' luxury seams, The Customs Houses'
   * works (batch C2).
   *
   * The first count asked of the *ground* rather than of the towns, the army or
   * the ledger, and it takes a whole `TileCondition` rather than being three
   * members because those three cards count three different facts about a hex:
   * what is built on it, what is buried in it, and which work stands there. The
   * condition vocabulary already says all three, and `perNeighbour` took the
   * same bargain one scale down — "beside a forest" and "beside an unimproved
   * forest" are one field with a different condition.
   *
   * **Ownership, not labour.** The sweep is `ownedTiles`, the one town walk, so
   * a mine nobody is working is still a mine the town has dug — the sheet's own
   * rule for this line (*"mine adjacency and origin-city mine counts do not
   * require every counted mine to be worked"*, `docs/decks/commerce.md`), and
   * the opposite reading from `workedHills` and `workedTilesInCity`, which count
   * citizens at work.
   *
   * Empire-wide by default and narrowed to one town by `within: 'city'`, the
   * narrowing `improvedBonusResources` and `wonders` already take. A row naming
   * no condition counts nothing, which is the honest answer for a question that
   * never said which hexes.
   */
  | 'tilesInBorders'
  /**
   * **Other empires this seat has met** — Travellers' Letters, whose news
   * travels with the cargo.
   *
   * `Player.metSeats`, the permanent register written by `recordMeetings`
   * (`visibility.ts`) the first time this seat sees a piece or a hex of
   * somebody else's. Read off the register rather than through
   * `hasMetSeat` (`diplomacy.ts`) because that module imports this one: the
   * derived clauses under the register only exist to backfill saves written
   * before it, and the schema has moved far past them.
   *
   * The wild is never in the register and is filtered out again here, so a
   * raider under your eye is nobody's acquaintance. Nothing lowers the count —
   * an empire you met and then destroyed is still an empire you met — which is
   * what makes the card's "no cap" safe to write.
   */
  | 'empiresMet';

/**
 * **The ledgers of what an empire did first.** Each is one `GameState.firsts`
 * record kind, written once and never again (`markFirst`, `state.ts`).
 *
 * A first is a **contention**, which is why the ledger is a list on the state
 * and not a derived reading: two empires may finish the same technology on the
 * same turn, and one of them was first. The rule is the codebase's standing one
 * — log order within a turn, sweep order within a phase — and it is stated on
 * `markFirst` itself, which is the only writer.
 *
 * A record is a **fact with a turn on it, never a countdown** (`TimedEffect`'s
 * discipline, and `SlottedOrder.sealedUntil`'s): nothing prunes this list and
 * nothing ticks it down. It is read two ways — a windfall rider asks whether
 * *this* occasion was a first (`CardWindfallRiderEffect.first`), and a count
 * asks how many of a kind an empire has written.
 */
export type FirstKind =
  /**
   * A town's **first building of a shelf** — Master Masons' guild, paid for the
   * wall that had no wall before it. Keyed on the town and the
   * `BuildingCategory`, so a second Monument in a second town is a second
   * record and a Monument and an Amphitheatre in one town are one.
   *
   * The town, and not the realm, because that is the sentence the cards make:
   * *"completing a culture building for the first time in a city"*. Its sibling
   * below is the same question asked of the whole empire.
   */
  | 'buildingInCity'
  /**
   * The realm's **first building of a row** — Learned Commissions', paid once
   * for each kind of great house the empire ever finishes. Keyed on the
   * `BuildingId` alone, so the first Forum anywhere is the record and the second
   * is not.
   */
  | 'buildingKind'
  /**
   * A town's **first purchase of a building** — Civic Receipts', paid for the
   * roof the town paid for rather than built. Keyed on the town alone: the card
   * is about a town learning to buy, not about which building it bought.
   */
  | 'purchaseInCity'
  /**
   * A **foreign town this empire's faith reached first** — The Living Hymnal's
   * verses. Keyed on the town, and written for the founder of the faith that
   * took the majority (`religionFounder`, so pay follows the stones).
   */
  | 'conversion'
  /**
   * **The world's first** completion of a technology — The Patent Rolls'.
   *
   * The one ledger in this union whose key is not an empire's own: it is written
   * against the world, so the second empire to finish Bronze Working writes
   * nothing and the card pays nobody twice. `markFirst`'s `world` reading, and
   * the contention rule above is what settles a tie.
   */
  | 'techWorld';

/** Every first-of-a-kind ledger, for the register that pins the seams. */
export const FIRST_KINDS: readonly FirstKind[] = [
  'buildingInCity',
  'buildingKind',
  'purchaseInCity',
  'conversion',
  'techWorld',
];

/** The ledgers whose key is the **world's**, not one empire's. See `markFirst`. */
export const WORLD_FIRST_KINDS: readonly FirstKind[] = ['techWorld'];

/**
 * The moments a growing card can be counting. See `CountKind`'s `tally`.
 *
 * A **separate, small union** rather than a reuse of `WindfallOccasion`, and the
 * distinction is the one that matters here: a windfall occasion pays *at* the
 * moment, out of the empire's own cards, and a tally occasion is only ever
 * written down. Some of these have no windfall twin at all (a wonder finished by
 * somebody else is nobody's windfall), and some windfall occasions would be
 * nonsense to count. Two vocabularies, each closed, each read in one place.
 */
export type TallyOccasion =
  /** A barbarian unit killed in battle — The Ballad-Weavers. */
  | 'barbarianKill'
  /**
   * A wonder finished **anywhere in the world**, by anybody — The Bell-Founders.
   *
   * The one occasion in this union whose subject is not the empire counting it,
   * and the reason the design allows exactly one such card: jealousy pays, and a
   * deck of world-watchers would play itself.
   */
  | 'wonderAnywhere'
  /** A great person spent on a work or a boon — The Reliquary Rolls. */
  | 'greatPersonSpent'
  /**
   * One of this empire's own units **died in battle** — The Chroniclers of the
   * Fallen.
   *
   * Battle, and deliberately not every way a piece can leave the board: it is
   * fired from the one seam that already means "somebody's soldier fell", the
   * `death` battle rider, so a disbanded worker and a starved-out garrison are
   * not deaths a chronicler writes down. That is the honest reading of "one of
   * your units dies" and it is also the only one with a single hook.
   */
  | 'unitLost'
  /**
   * Gold paid out of the treasury by the **purchase verb** — The Almoners' Book.
   *
   * The amount is the coin itself rather than one, which is what
   * `recordScalingOccasion`'s `amount` is for: the tally holds the raw sum spent
   * and the card's `per` divides it, so the remainder is kept by the counter
   * instead of being rounded away a purchase at a time.
   *
   * `purchaseItemAt` and nowhere else — the verb whose whole name is *purchase*.
   * Buying a hex, recruiting a great person and paying a payroll all spend gold
   * and none of them is a purchase in the sense the card's face uses the word.
   */
  | 'goldSpent'
  /**
   * A unit of **somebody else's** killed in battle — The War Chronicle.
   *
   * `barbarianKill`'s unnarrowed twin and a member of its own rather than an
   * argument on it, for `improvedStrategicResources`' reason one union over: the
   * two read differently on a card ("per barbarian you have killed", "per unit
   * you have killed") and a member each is what lets `TALLY_WORDS` say so. Both
   * are written at one seam (`payBattleRiders`, the `kill` occasion) and a kill
   * against the wild therefore raises **both** counters — two cards watching two
   * different questions about one moment, which is exactly what the pair is for.
   */
  | 'unitKilled'
  /**
   * A unit **trained** — The Muster Rolls, and the ratified text's *"purchases
   * do not count"*.
   *
   * Written in `realiseItem`'s unit path, the one routine that means "the city
   * now has the thing", and narrowed there by the two facts that routine is the
   * only thing holding: a piece bought at the till (`RealiseOptions.bought`) and
   * a piece handed over free (`options.free`, Camp Followers' stray) were not
   * trained. That is the same clause the escalation ladder already reads two
   * lines away, said once more rather than derived from the board — a moment
   * later a bought spearman and a hammered one are one spearman.
   *
   * It is deliberately **not** `WindfallOccasion`'s `unitCompletion`, which
   * fires for a bought unit on purpose (Rites of Passage is one row and pays
   * once). Two vocabularies, two readings, each closed.
   */
  | 'unitTrained'
  /**
   * A barbarian camp **burnt out** — The Pacified Marches.
   *
   * `CountKind`'s `clearedCamps` written into a chair: that count is the
   * lifetime record on `Player.campsCleared` and this is the same moment counted
   * by whichever slotted Order was watching, so a card that pays for a border
   * pacified *since it was seated* can say so. The pair is `goldSpent`'s
   * exactly — one deed, two counters, because a card in a chair and a record on
   * the player answer different questions.
   */
  | 'campCleared';
// **There is deliberately no `cityGrew`**, and the audit asked for one: every
// growth card in the six decks is bound by the design doc's standing clause
// that natural-growth rewards *count only growth beyond the town's historical
// population maximum* (`docs/six-decks-first-cut.md`, the Expansionist and
// Magisterial convention blocks). Nothing in the game remembers the largest a
// town has ever been, so a bare "a town grew" counter would have paid The
// Growing Annals twice for one citizen a levy took and the fields gave back.
// The member is one line the day a town keeps its high-water mark; the counter
// without it is the card bent to fit.

/** Every tally occasion, for the register test that pins the hooks. */
export const TALLY_OCCASIONS: readonly TallyOccasion[] = [
  'barbarianKill',
  'wonderAnywhere',
  'greatPersonSpent',
  'unitLost',
  'goldSpent',
  'unitKilled',
  'unitTrained',
  'campCleared',
];

/** What a `pays` rate reads. A *rate* or a meter standing, never a bank. */
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
  /**
   * Faith banked this turn by the towns that **keep this empire's faith** —
   * Cuius Regio's, *cuius regio, eius religio*: whose realm, his religion.
   *
   * `capitalFaithPerTurn`'s sibling one congregation wider, and a source of its
   * own for that member's reason exactly: a rate is a fact about the empire's
   * books, and "what did my faithful towns bank" is a third reading of the
   * calendar beside "what did I bank" and "what did the capital bank". Summed
   * off the same sweep `collectYields` is already making, over the towns this
   * empire owns whose derived `cityReligion` is one of the faiths it is paid by
   * (`heldReligions` — the holy city's, so a conquered shrine moves the sentence
   * with it), so nothing here can disagree with the banner a town flies.
   */
  | 'followingFaithPerTurn'
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
  | 'growthSurplus'
  /**
   * What this empire's army costs it every turn (`unitUpkeepTotal`).
   *
   * The eighth rule, and it exists because there is finally something to
   * discount: Tyranny's "30% less maintenance cost for units" and The Standing
   * Army's "units cost no upkeep" were both `deferred` on their rows with the
   * note *"units cost no maintenance in this game"* until the 2026-08-28 ruling
   * gave the game `upkeep.ts`.
   *
   * The sign is the rule's own: a **negative** percentage is a discount, exactly
   * as `settlerCost`'s is, so a card that halves the payroll prints −50 and a
   * card that doubles it prints +100. Folded once, in `explainEmpireGold`'s
   * maintenance line, and clamped so a −100% army is free rather than a mint.
   */
  | 'unitUpkeep'
  /**
   * **What one step along a road costs a marching piece** (`roadStepCost`,
   * `pathfind.ts`) — Machinery's *"roads at a fifth instead of a third"*.
   *
   * The ninth rule and the only one that is not about a city's books at all. It
   * is here rather than as an effect kind of its own because it is exactly what
   * `settlerCost` and `unitUpkeep` are: a percentage on a constant the game
   * already reads in one place, with the same sign convention — a **negative**
   * percentage is a discount, so a third becoming a fifth is −40.
   *
   * Read **once per sweep**, into `MoveProfile.roadStep`, and never inside
   * `stepCost` itself: a step's price is asked tens of thousands of times inside
   * one search and a card walk per edge would be `zocField`'s mistake made
   * again. Everything downstream — `findPath`, `reachableTiles`,
   * `advanceAlongPath`, `pathTurns` — inherits it through the one evaluator, so
   * no highlight can promise a march the walk will not make.
   *
   * The result is snapped onto `MOVEMENT_DENOMINATOR`, which is fifteen for this
   * rule's sake: a third and a fifth are both exact fifteenths, and every
   * running total in the searches has to compare equal to itself.
   */
  | 'roadStepCost'
  /**
   * **How many turns a trade route runs before it lapses** (`rules.trade.
   * routeTurns`) — Venture Routes' two extra turns (batch C3).
   *
   * The tenth rule, and it is here for the reason the three above it are: the
   * term is one constant the game reads in one place, so a percentage on it is
   * the same shape as a settler's price or a road step's cost rather than a new
   * kind of effect. The sign is theirs too — a **positive** percentage is a
   * longer term, because the figure is a length and not a price.
   *
   * Read through `routeTermFor` (`trade.ts`), which both writers of
   * `TradeRoute.expiresTurn` call: the route being opened (`startRouteAt`) and
   * the auto-resend that renews one (`marchTraders`, `turn.ts`). A renewal
   * **rewrites** the expiry rather than extending it, so an empire that picks
   * the card up gets longer terms from its next renewal on, and one that drops
   * it goes back to the short term on the renewal after that. `startedTurn` is
   * never touched by either, so Established Routes' thirty-turn count is
   * unaffected by anything this rule does.
   *
   * A card's own words are in **turns** because that is what a player plans
   * around; the row is a percentage because that is what the shape takes, and
   * the two agree at the term the rules table currently holds.
   */
  | 'routeTerm'
  /**
   * **How far a caravan may be sent by sea** (`rules.trade.rangeTurns`) — The
   * Harbour Chain's three extra turns of reach (batch C7).
   *
   * The eleventh rule, and `routeTerm`'s neighbour in every respect: the range
   * is one constant the gate reads in one place (`routeRange`, `trade.ts`), so a
   * percentage on it is the same shape as a settler's price rather than a new
   * kind of effect. A **positive** percentage is further, because the figure is
   * a length and not a price.
   *
   * The medium is in the rule's name rather than in a narrowing on the shape,
   * for `ActionRuleId`'s `capitalBuysWithoutLimit` reason: `cardRulePercent`
   * asks the empire and takes at most a town, so it has no route to ask which
   * way one runs. A card that wanted longer land routes would be a twelfth
   * member.
   *
   * The percentage is taken of the **base** range and the trading posts' turns
   * are added after it, so a card reading "+3 range" adds exactly three however
   * many posts the pair holds. `routeRange`'s docblock says why.
   */
  | 'seaRouteRange';

/** A constant of the two meters a card may rewrite. */
export type MeterRuleId =
  /** What a captured city costs in authority. `value` replaces the constant. */
  | 'capturedCityCost'
  /** What a coastal city costs. `delta` shifts the constant. */
  | 'coastalCityCost'
  /**
   * What a city standing **on hills** costs. `delta` shifts the constant.
   *
   * Hill Forts' second half, and `coastalCityCost`'s twin in every respect: a
   * fact about the ground a town was founded on, priced once in
   * `cityAuthorityCost` and previewed by `explainFoundingCost` through the same
   * reading, so the settler sheet cannot disagree with the meter.
   */
  | 'hillCityCost'
  /**
   * How many citizens in each city demand **no happiness at all** — The
   * Scattered Hearths' first three, who are the household and not the crowd.
   *
   * `delta` shifts the count, which is zero in every game nothing says
   * otherwise. Read in `explainHappiness`'s demand line and nowhere else: the
   * town's demand is charged on `max(0, population − free)` citizens
   * instead of on all of them, and **outside** the `happinessDemand` factor —
   * a waiver is a fact about *who is counted*, where Toleration Edicts is a
   * discount on what each one asks for.
   */
  | 'freeCitizens'
  /** Borders keep growing while the writ is in deficit. */
  | 'borderFreezeExempt'
  /** A negative writ stops slowing production toward units. */
  | 'authorityUnitProductionExempt'
  /**
   * **What one town costs this empire's writ**, for the towns a scope admits —
   * Marcher Lords' border forts, The Learned Chancery's institutes, The
   * Chartered Metropolis' surcharge.
   *
   * The three rules above it price a **kind of ground** (a seizure, a harbour, a
   * hill) and are chosen by an exclusive ladder in `cityAuthorityCost`: a
   * captured coastal hill town is priced once, as a seizure. That ladder is the
   * whole reason a card could not say *"this city costs one less authority"* of
   * anything else — a fourth arm would have had to decide where in the
   * precedence it sat, and ten rows across five decks each wanted a different
   * class of town.
   *
   * So this one is **not an arm of the ladder**: it is a `delta` applied to
   * whatever the ladder priced, once per town, off `CardMeterRuleEffect.scope`.
   * A row with no scope reaches every town and is the honest reading of "cities
   * cost one less"; a row with one reaches the towns it admits. Two cards stack,
   * because two deltas on one constant have always summed here.
   *
   * **The floor is stated and is two-sided** (`cardCityCostDelta`'s caller): a
   * discount never takes a town below one and never charges a town that was
   * already free — `max(min(cost, 1), cost + delta)`. The first half is every
   * card's own printed words ("minimum one"); the second is what keeps a
   * discount a discount, since a capital and a relieved puppet can both cost
   * nothing and a naïve floor at one would have made a *gift* raise their price.
   *
   * It is a **cost**, never capacity, which is the meter's standing rule read
   * the way it was written: a card that wants the realm's writ wider says
   * `authority` and gets a line in the gains; a card that wants one town cheaper
   * to hold says this and the town's own line moves. The two halves of the meter
   * go on meaning what they meant.
   *
   * **The settler's preview does not carry it**, and that is a stated cut: a
   * town nobody has founded is no `City`, so there is nothing to ask a scope of
   * — Marcher Lords' border fort is scoped on ground the site has and The
   * Learned Chancery's on a building it has not raised, and a preview that
   * guessed one would be promising a figure for the other. So
   * `prospectAuthorityCost` prices the ladder alone and the town's real line
   * moves the turn it is founded, which is the honest direction to be wrong in:
   * the writ a settler is quoted is never cheaper than the writ it costs.
   */
  | 'cityCost';

/** A verb whose behaviour a card changes outright. */
export type ActionRuleId =
  /** A chop spends no worker charge. */
  | 'freeChop'
  /** Production overflow from a completion is doubled. */
  | 'doubleOverflow'
  /** A unit further down the queue completes ahead of an unaffordable building. */
  | 'unitJumpsQueue'
  /**
   * A great person waiting in the offer may be **bought outright with gold** —
   * The Commonwealth's, and the honest reading of "great people can be purchased
   * with gold" in a game where a great person is *called* rather than built or
   * bought (`UnitDef.greatWork`, refused by both `buildError` and
   * `purchaseError`).
   *
   * What is for sale is the **recruitment**, not the piece: the command pours
   * the remaining renown into `settleRenownWindfall` and the offer opens exactly
   * as the ladder would have opened it, so there is still one draft path and one
   * place a name is taken. See `purchaseGreatPersonOffer` (`greatPeople.ts`).
   */
  | 'buyGreatPersonWithGold'
  /** The same, out of the faith bank — The Magisterium's. */
  | 'buyGreatPersonWithFaith'
  /**
   * A draft of great **scholars** may be bought with faith — The Academy's, and
   * the user's ruling of 2026-09-03 (*"you could spend faith for a great person
   * draft that only contained scholar. Shouldn't scale the renown costs"*).
   *
   * Its sibling above buys a **rung of the ladder**: renown is poured to the
   * threshold, the pool is spent and the next recruitment is dearer. This buys
   * the **draft itself** — a hand of scholars dealt on the spot at a flat price,
   * with the renown pool and the threshold untouched — which is why it is a
   * third entry in `OFFER_PURCHASES` rather than a second price on the faith
   * bank. Still one draft path: the offer it opens is the offer the ladder would
   * have opened, blocks End Turn the same way, and `chooseGreatPerson` answers
   * it. See `greatPeople.ts`.
   */
  | 'buyScholarDraftWithFaith'
  /**
   * **A building that supplies science may be bought with faith**, in every town
   * — al-Khwārizmī's second half (the great-person pass, batch GP2).
   *
   * A *verb* whose behaviour changes and therefore an `ActionRuleId`: the
   * question it answers is "which bank sells this", which is `purchaseError`'s
   * and `explainPurchaseCost`'s, and it is answered in the one place that
   * question is answered (`faithBankOpen`, `purchase.ts`) beside the Reliquary's
   * marker rather than instead of it. So a town holding both sells its soldiers
   * *and* its libraries out of faith, and neither clause has heard of the other.
   *
   * **Which buildings** is the reading `CardBuildingYieldPercentEffect.pays`
   * takes of the same word — a science building is a building whose row supplies
   * science, flat or per citizen (`buildingPaysVoice`, `buildingData.ts`) — so a
   * card that raises the science houses and a card that sells them cannot
   * disagree about which houses those are.
   *
   * **The rate is `faithPerHammer`**, the rate a contribution and a Reliquary's
   * unit already pay, which is the marker's own bargain: the empire's law widens
   * *which bank may pay* and never what a thing costs. A row naming its own bank
   * is untouched, for that marker's stated reason.
   */
  | 'faithBuysScienceBuildings'
  /**
   * **The first redraw of every hand this seat is dealt costs nothing** — Ibn
   * Battuta's Rihla (batch L6a, `docs/leaders.md` "The thirteen").
   *
   * It opens the reroll's door and waives the reroll's price, once per offer:
   * the redraw itself is the one the game already deals (`settleReroll`), from
   * the seat's own pool and off `state.rng`, so there is one draw and one place
   * a hand comes from. The stamp that spends it is on the **offer** rather than
   * on the seat (`OrderOffer.rerolled` and its two siblings, presence-is-state),
   * which is what makes it *every* draft rather than one a game.
   *
   * **Never a belief.** A belief hand's first asking is already free on its own
   * ladder (`explainBeliefRerollCost`), so the rule would be waiving a price of
   * nought and then charging the second asking as if it were the first.
   */
  | 'rerollOffers'
  /**
   * **The capital may buy as many units in a turn as it can pay for** — The
   * Capital Arsenal (batch C2).
   *
   * The one-buy-per-class-per-turn stamp (`City.purchasedUnitTurns`) is
   * compared against in exactly one place, and this rule is a clause beside
   * that comparison. Nothing else changes: the stamp is still written by
   * `purchaseItemAt`, so a town that loses the card is back under the limit the
   * same turn and no state has to be unwound.
   *
   * The capital is named in the rule rather than left to a scope because a flag
   * rule carries none — `cardActionRule` asks the empire, not a town — and the
   * one town every empire has exactly one of is the only place a flag can
   * honestly mean. A second card that wanted the same licence somewhere else
   * would want a scoped shape, which is a design decision rather than a member
   * here.
   */
  | 'capitalBuysWithoutLimit'
  /**
   * **A unit bought with coin needs no strategic resource** — Foreign
   * Procurement (batch C2).
   *
   * The requirement is `buildError`'s (`tech.ts`, the two clauses under
   * `requiredResource`), and the purchase rail reaches it through that same
   * gate — so the rule is read where the till asks the question and handed down
   * as `BuildGateOptions.ignoreResourceRequirement` rather than read inside
   * `buildError` itself. That is what keeps it a rule about *buying*: a town
   * still may not put the swordsman in its queue.
   *
   * It waives the requirement and not the ledger. A piece bought this way is an
   * ordinary piece afterwards, so it takes a copy in `resolveCommitments` like
   * any other — an empire that buys past its iron finds the iron spoken for.
   * That is the honest consequence of a derived ledger rather than a second
   * kind of unit nobody else would know about.
   */
  | 'buysWithoutResources'
  /**
   * **Gold may buy a world wonder** — The Gilded Scaffold (batch C3, ruled in
   * `docs/flags.md` item (pppppp)).
   *
   * "A wonder is never for sale" is one `if` in `purchaseError`, and it already
   * had one lift: the Valley of Kings waives it for faith in a single town
   * (`BuildingDef.faithBuysWonders`). This is the second clause of that same
   * `if` and not a second way to buy a wonder, which is what keeps every other
   * refusal below it intact — `buildError` still refuses a wonder another empire
   * has claimed, one whose technology is not in, and one whose site the ground
   * does not hold.
   *
   * It is wider than the faith lift on purpose, because the card is: the faith
   * lift is narrow in two dimensions (one bank, one town) and this is narrow in
   * one (gold, anywhere this empire buys). What the original refusal protected —
   * that one-per-world is not decided by whoever is richest the turn a wonder
   * unlocks — is paid for by the card's other half rather than by the rule, and
   * the ruling says so.
   */
  | 'goldBuysWonders'
  /**
   * **Gold may pay for a redraw** — The Brokers' Redraw (batch C3, the same
   * ruling).
   *
   * A redraw is priced in faith on one rising ladder (`explainRerollCost`) and
   * charged to `Player.faithPool`. This rule does not add a second ladder: it
   * opens the *bank* as a parameter, the way `purchaseItem` has always carried
   * one, and the gold figure is the faith figure times
   * `statecraft.redraw.goldMultiple` — a premium above what the two banks trade
   * at elsewhere in the game, so faith stays the efficient route and the card is
   * a convenience rather than a replacement. That is what the faith-only rule
   * was protecting: a reason to keep faith worth banking in an empire with no
   * religion.
   */
  | 'goldBuysRedraw'
  /**
   * **Gold may buy a hex while the writ is overdrawn** — Purchased Prosperity
   * (batch C4).
   *
   * An empire in authority deficit has its borders frozen (`bordersFrozen`,
   * `meters.ts`), and the freeze is deliberately three things at once: the
   * accrual stops, the border stops expanding, and `purchaseTile` is refused —
   * *"a freeze money could step around would be a freeze on the poor only"*,
   * which is `tilePurchaseError`'s own note. This lifts the third of those and
   * only the third, as one more clause on that same `if`, which is
   * `goldBuysWonders`' shape and for its reason: every other refusal in the
   * function still stands, so a hex another empire owns, a hex out of reach of
   * any of your towns and a treasury that cannot pay are all still refused.
   *
   * It is deliberately **not** `MeterRuleId`'s `borderFreezeExempt`, which is
   * the same freeze lifted at the accrual: that one says an overdrawn realm goes
   * on growing for free, and this says it may go on *paying*. A card that meant
   * both would name both.
   */
  | 'goldBuysFrozenTiles'
  /**
   * **A sea route between two towns that both hold this empire's trading post
   * may be sent any distance** — The Admiralty of Trade (batch C7).
   *
   * The range clause in `gateRoute` (`trade.ts`) compares the march against
   * `routeRange`, and this is one more condition on that comparison rather than
   * a change to the figure — `goldBuysWonders`' and `goldBuysFrozenTiles`' shape
   * exactly, and for their reason: every other clause of the gate still runs, so
   * a sea lane that does not exist, a partner not met, a war, a full slot table
   * and a route already running that way are all still refused. The card's own
   * sentence says as much.
   *
   * The two narrowings are named in the rule because a flag rule carries no
   * scope (`cardActionRule` asks the empire), which is `capitalBuysWithoutLimit`'s
   * stated bargain. The gate holds both towns and the mode when it asks, so it
   * can answer them itself: the mode must be `sea`, and both towns must hold a
   * **paying** post (`cityPostPays`), which is the design's own suspension —
   * *"foreign post income and card range privileges are suspended during war or
   * while the host city is blockaded"*. A card that wanted the same licence by
   * land would be a second member here.
   */
  | 'postsWaiveSeaRouteRange'
  /**
   * **The named building may be raised in every town** — Caravanserai Cities
   * (batch C7).
   *
   * It lifts `BuildingDef.oncePerEmpire`, the *limit*, and nothing else. That
   * separation is the whole of the work behind this member and it is the user's
   * own ruling: *"the caravanserai should still be an empire building"*. So the
   * row keeps `BuildingDef.empireBuilding`, and every reading that asks what
   * class a building is goes on answering the same — the price still scales a
   * great house by the towns it serves, `hasEmpireBuilding` still admits the
   * town, `CountKind`'s `empireBuildings` still counts each one, and Private
   * Patronage's discount on the *ordinary* shelves still passes it by. The card
   * buys a realm many of an expensive thing rather than turning it into a cheap
   * thing.
   *
   * **Which** building is `CardRuleEffect.building`, which is why this is the
   * first rule in the union to carry a narrowing that is not a `UnitFilter`: a
   * flag rule reaches the empire, and "every building loses its limit" is not a
   * sentence anybody wants written by accident.
   *
   * Read in `buildError` (`tech.ts`) beside the refusal it lifts, which is
   * `goldBuysWonders`' shape: every other clause of the gate still runs, so the
   * technology, the site and the town's own duplicate check all still refuse.
   */
  | 'buildsEverywhere';

/**
 * Something about the world that stops being true — or starts.
 *
 * Three of these were Wolf-Mother's Pact, which is the shape working: a
 * doctrine that rewrites the wild's relationship with an empire says so in
 * named rules that three verbs read, rather than in one clause the wild's own
 * module has to know about. The user's card pass of 2026-09-03 cut that
 * doctrine back to **one** of the three, and the other two are **held with no
 * live row naming them** — the verbs go on asking, so restoring either clause
 * to a card is a JSON row rather than a change to the wild's own module.
 */
export type BehaviorRuleId =
  /**
   * The wild never attacks this empire. Theft continues.
   *
   * Read at two seams — `nearestTarget` and `barbarianRoles` — and carried by
   * no live row since 2026-09-03. See the union's docblock.
   */
  | 'barbariansPassive'
  /**
   * A barbarian **killed** by this empire changes sides instead of dying, **at
   * full health** — handed over by `captureUnit` in `applyCombat`'s kill path,
   * which is the one implementation of a change of hands and the reason this is
   * a rule rather than a second way to acquire a piece. The health is the
   * user's card pass of 2026-09-03: the pact lost its two other clauses and
   * bought a whole soldier with the difference.
   */
  | 'barbarianKillsConvert'
  /**
   * This empire can no longer **clear a camp**: arriving on one burns nothing
   * out and pays no bounty (`arriveOnTile`). It was Wolf-Mother's price for the
   * conversion above — the wild is an ally, and you do not sack an ally's
   * villages — and is carried by no live row since 2026-09-03. See the union's
   * docblock.
   */
  | 'noCampClearing'
  /**
   * This empire's pieces **do not heal outside its own borders** — Homer's
   * price, sung for an army ten years from home.
   *
   * Read in `healUnits` (`turn.ts`), which is the one place a heal is decided,
   * beside the rested rule and the `unitStat` bonus rather than instead of
   * either: the piece is still rested, it still carries whatever a card adds,
   * and the *ground* refuses it. A hex nobody owns is outside your borders, which
   * is the reading that makes the clause bite on a campaign rather than only in a
   * rival's homeland.
   */
  | 'noHealAbroad'
  /**
   * **Roads near a city cost nothing to keep** — The Imperial Post's.
   *
   * A rule about the *count* rather than about the price, and read in the one
   * place a road's upkeep is counted (`roadsBuiltBy`, `empireGold.ts`), which
   * is what keeps `explainEmpireGold`'s four lines four. `rules.trade.postRange`
   * is how near "near" is, so the reach is data and this is only the switch.
   */
  | 'freeCityRoads'
  /**
   * A piece that **kills** is given its movement back for the rest of the turn —
   * Blitz's first half.
   *
   * Read in the one place an attack spends a turn (`applyCombat`, the surviving
   * attacker's bookkeeping), beside the light hull's hit-and-run price rather
   * than instead of it: what is refilled is the *purse*, and `hasAttacked` is
   * still set, so "one blow a turn" is untouched and what the Doctrine buys is
   * somewhere to be afterwards. It fires only on a kill — a blow that wounded
   * ends the turn exactly as it always did — which is what the card's own words
   * say.
   */
  | 'moveAfterKill'
  /**
   * A raid **costs this empire nothing to make** — Tyranny's, and the user's
   * Governments marks of 2026-09-08 ("Pillaging pays +50% and costs no
   * movement").
   *
   * Read in the one place a raid spends a turn (`pillageAt`, `improvements.ts`),
   * where the single point comes off, and it is that point the rule withholds —
   * not the whole allowance and not the verb's gate. `pillageError` is untouched
   * on purpose: a column that has run itself dry still cannot burn a farm, so
   * the law buys tempo inside a turn rather than a free action out of nothing.
   *
   * A rule rather than a second windfall rider because the coin and the walking
   * are different things: the salvage composes through `windfallPayout` with
   * three other rows, and the movement is a fact about the piece that no payout
   * has a field for.
   */
  | 'freePillage'
  /**
   * This empire's pieces **cannot dig in** — Blitz's price.
   *
   * Read in `fortifyError` (`combat.ts`), which is the one rule the button and
   * the reducer both ask, so a Doctrine that forbids the trench greys the button
   * out and refuses the command with one sentence. It says nothing about a piece
   * already fortified when the card was slotted: a trench is broken by moving or
   * attacking (`breakFortify`) and nothing here reaches back to fill one in.
   */
  | 'noFortify'
  /**
   * A piece of this empire that **comes to rest in one of its own cities** has
   * its allowance filled back up — The King's Road, whose whole point is that
   * the realm's towns are stages on a march.
   *
   * Read at the one seam a piece comes to rest (`arriveOnTile`), beside the
   * ruins and the camps, because that is what the clause is: a consequence of
   * the foot landing rather than a verb anybody issues. The allowance is **set**
   * to `fullMovement` and never added to, which is what stops it compounding —
   * a piece cannot bank a second turn's marching by walking in and out, because
   * leaving costs a step and arriving only ever refills to the same figure. A
   * piece that arrives and leaves has left; the refill is the arrival's, not the
   * town's, so standing in the city all turn is worth nothing at all.
   */
  | 'cityRestoresMovement'
  /**
   * **Wading ashore costs this empire nothing** — Admiralty's landing.
   *
   * The shore crossing is a fact about a *pair* of hexes and is therefore priced
   * in `stepCost` and nowhere else (the movement trap): the rule rides the
   * mover's own `MoveProfile`, resolved once per sweep like `embarks`, so the
   * highlight, the estimate and the march all quote the free landing by
   * construction. It is the **landing** half alone — a step from water onto
   * land. Embarking still ends the turn, which is what keeps a sea a sea.
   */
  | 'freeLanding'
  /**
   * **This empire's laden caravans cannot be taken** — Pytheas of Massalia, who
   * sailed past everybody and came home (the great-person pass, batch GP2).
   *
   * A *fact about the world* and therefore a `BehaviorRuleId`: what changes is
   * not a verb this empire uses but what everybody else's soldiers may do to its
   * carts, which is `noHealAbroad`'s shape exactly (a rule read on the far side
   * of somebody else's decision).
   *
   * **Read as target selection, not as a blow that lands for nothing.** A laden
   * trader of a protected empire is simply not something to attack
   * (`attackTargetAt`, `combat.ts`) — the one reading the tint, the forecast and
   * the reducer all take, so the hex is not painted, the card is not offered and
   * the command is refused with the sentence a hex holding nothing gets. The
   * alternative — a blow that resolves and does nothing — would have spent the
   * attacker's turn on a shrug and given a player no way to see why.
   *
   * **Melee and shot alike.** The ratified text is *"your trade units cannot be
   * pillaged"*, and a caravan killed by an archer is as taken as one plundered by
   * a spearman: the two seams differ in what the attacker walks away with, not
   * in what the merchant loses. Stated here because it is the one place the
   * reading could have gone the other way.
   *
   * **And the arrival seam with it** (`arriveOnTile`): a winner that kills an
   * escort and steps onto the hex leaves the cart standing — neither plundered
   * nor captured, which is the third thing that could have happened and would
   * have been worse than either. Same rule, second sentence, exactly as the
   * plunder clause itself is written in both places.
   */
  | 'tradersUnplunderable'
  /**
   * **A road that ends abroad brings a luxury home** — The Silk Road's, and the
   * user's tree pass of 2026-09-10 (`docs/flags.md` (uuu), mark 6).
   *
   * Every live route of this empire that ends in another realm's town hands the
   * sender **one** copy of a luxury that town holds improved, and every figure
   * that copy pays is worth `rules.trade.importedLuxuryPercent` of what an owned
   * seam pays — half, as the user's figure has it, where
   * `docs/playstyles.md` §7 had written the whole.
   *
   * A *fact about the world* and therefore a `BehaviorRuleId`: what changes is
   * not a verb this empire uses but what its own caravans are carrying, which is
   * `tradersUnplunderable`' shape exactly. Read in the one module that counts
   * luxury copies (`resourceEffects.ts`, `importedLuxuries`) so that the tenth
   * thing a luxury pays is halved by the same multiplication as the first, and
   * nothing else in the game learns a second word for "a luxury you hold".
   *
   * **Unique kinds only, and never a kind the empire already controls**: a
   * second copy is worth what a second copy has always been worth (nothing, bar
   * the Grand Bazaar's `luxuryDuplicates`), so a road that could only bring home
   * a kind already dug is a road that brings home nothing. It **lapses with the
   * route**, because it is derived from the live routes every time it is asked
   * and there is nowhere for it to be written down.
   */
  | 'routesImportLuxuries';

/** A rule of **Statecraft itself** that a card rewrites. Entry XV.b's metaRule. */
export type MetaRuleId = 'sealTurns';

/** What an amplifier reaches into. */
export type AmplifierTarget =
  /**
   * **How many copies this empire's own strategic seams supply** — Strategic
   * Exports' doubling (batch C7).
   *
   * The user's ruling is what makes it an amplifier rather than anything that
   * touches the board: *"it doesn't need to modify map state, just the player
   * data on resource totals"*. So no card writes `Tile.resourceCopies`, the
   * tile facts stay placed-once, and this scales the empire's **total** on the
   * way out of the sweep.
   *
   * Read in `resourceCopies` and in `controlledHoldings` (`cities.ts`), on the
   * one term the two folds share — what the empire's own opened tiles supply —
   * and **outside the memo those two walks are kept in**. Two reasons, and both
   * are load-bearing:
   *
   *   · the walk is remembered on the economy clock, and that clock does not
   *     move when a card is slotted. A law read inside it would leave every copy
   *     count stale for the rest of the turn, and a stale copy count is a unit a
   *     seat can or cannot build — a played game parting from a replay of its
   *     own log;
   *   · copies another empire **lent** you are not your deposits. The card says
   *     *your* strategic resource deposits, so the factor reaches the term the
   *     ground supplies and neither of the two terms a bargain moves.
   *
   * Strategic rows only, which is the card's own word: asked of
   * `ResourceDef.kind`, so a luxury seam is untouched however large the share.
   */
  | 'strategicCopies'
  /**
   * **How many copies a luxury deposit with a mine on it supplies** — Royal
   * Assays' extra copy (batch C8).
   *
   * `strategicCopies` one kind over and one dial across: that one is a *share*
   * of the whole term this empire's own strategic seams supply, and this is a
   * **flat step per deposit** (`amount`, read through `cardAmplifierFlat`), which
   * is what "each deposit provides one additional copy" says. A share could not
   * have said it — half again on three seams is not one more from each.
   *
   * Everything C7 established about the other target holds here unchanged, and
   * for the same reasons:
   *
   *   · read in `resourceCopies` (`cities.ts`) and **outside the memo** the map
   *     walk is kept in, because that memo sits on the economy clock and a card
   *     slotted mid-turn does not move it. A stale copy count is a unit a seat
   *     can or cannot build;
   *   · applied to the term the **ground** supplies, so a copy lent to this
   *     empire gains nothing and a copy lent away comes off the raised figure
   *     rather than being raised with it;
   *   · no tile is written. The map's own quantities are placed once in
   *     `newGame` and stay what they were.
   *
   * What differs is the narrowing: **luxury rows with a mine standing on them**.
   * The kind is `ResourceDef.kind`, the work is the improvement on the hex, and
   * the deposit has to be open to this empire like any other — the sweep counts
   * qualifying deposits beside the copies they supply, so the law multiplies a
   * figure the walk already had rather than walking the map a second time.
   *
   * The card says "improved … with a mine", which the mine itself satisfies: a
   * mine is an improvement, so there is no second test for "improved".
   */
  | 'luxuryMineCopies'
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
   * Read in `explainRouteYieldBetween` (`routeYields.ts`), which is where the three
   * lines of a route's figure are folded, and it joins as **one more line of
   * that list** rather than as a multiplication afterwards: rule 5 for a
   * caravan. The route's owner is the origin's, which is the seat that sent it.
   */
  | 'routeYields'
  /**
   * What **founding a religion** pays its founder for the followers it has —
   * Apostles' doubling.
   *
   * Read where the trickle is folded (`liveEffects`' seventh source), on the
   * figures `religion.json`'s `founderTrickle` prints, before anything is
   * banked. It reaches the trickle and nothing else: a follower belief's own
   * lines are a different list and are not amplified by it, which is what keeps
   * "the trickle is doubled" a sentence about one row rather than about the
   * whole religion.
   */
  | 'founderTrickle'
  /**
   * What a **great person's act** pays — Leonardo, whose notebooks make another
   * man's one afternoon worth two.
   *
   * Read in `greatPersonActAt` (`greatPeople.ts`), on each family's own figure
   * before it reaches the seam that banks it, so a doubled engineer pours twice
   * the hammers through the *same* `settleProductionWindfall` and a doubled
   * scholar twice the beakers through the same `settleResearchWindfall`. It
   * reaches the act and never the **work**: a citadel is a thing on the ground
   * and has no figure to amplify, which is the honest split rather than a
   * silence.
   *
   * An act is not a project (Entry XXVI) and this is not a `projectRider`: a
   * project is a queue row that pays every turn, and an act happens once.
   */
  | 'greatPersonAct'
  /**
   * What **city connections** pay — Nanaivandak's road home, both halves of it.
   *
   * Read in `explainEmpireGold` (`empireGold.ts`), on the connection line's own
   * figures, and it joins that fold as the line's own total rather than as a
   * multiplication afterwards — rule 5 for a treasury, exactly as `routeYields`
   * is rule 5 for a caravan. It reaches the connections and nothing else: road
   * maintenance and the two payrolls are separate lines of the same list and are
   * not what a merchant's ledger made cheaper.
   *
   * The **second target that reads `amount`**, and the one that shows why that
   * field is generic rather than a favour to Ea-nāṣir: a connection's gold is
   * quoted *per city*, so "+2 gold for each city connected to your capital" and
   * "+10% gold from those connections" are one card's two dials on one figure,
   * and Nanaivandak carries both on one row.
   *
   * It is an amplifier rather than a `CountKind` for a discipline reason worth
   * stating: `trade.ts` reads *this* module and may not be read back, so a count
   * that asked `connectedCities` would have had to grow a second flood fill in
   * `statecraft.ts` — and two answers to "which of my towns are joined" is
   * exactly the drift rule 5 exists to prevent.
   */
  | 'connectionYields'
  /**
   * What a **Triumph** pays in renown — The Academy of Deeds' "every Triumph
   * pays its renown twice over".
   *
   * Read in `awardTriumph` (`triumphs.ts`), on the row's printed figure, before
   * `settleRenownWindfall` banks it — Entry XVIII.5's discipline at the fifth
   * bucket: the figure is composed once, so what the annal announces and what
   * the pool receives are one number. It reaches a Triumph's lump and never the
   * buildings' trickle, which is a different line of `explainRenown` and a
   * different sentence.
   */
  | 'triumphRenown';

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
  /**
   * A city **founded** (`foundCityAt`) — The Charter of the Marches' bounty for
   * planting another flag.
   *
   * `CardFoundingRiderEffect` and this occasion are two questions about the same
   * moment and neither is the other, which is why both exist: that shape says
   * what the new town is founded *with* — a citizen, a granary, a road home —
   * and this says what the **empire** is paid for having founded it. A charter
   * that granted culture through the rider would have had to invent a place to
   * put it, because a rider is read by the town being built and culture belongs
   * to the realm.
   *
   * It fires for the founding and not for a capture: a captured town is
   * somebody else's founding, and `capture` is its own occasion.
   */
  | 'found'
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
  /**
   * A **vein surfaced** (`prospectAt`, on a strike and only on a strike) — the
   * Geomancy pass of 2026-09-05.
   *
   * `prospect`'s other half, and a member of its own rather than a flag on it
   * for the reason that occasion's own docblock states so plainly: the survey
   * pays for the *asking*, because certainty is the thing being bought, and a
   * rider on it that only fired on a strike would be a second rule about what a
   * survey is. So the two moments are two occasions on one verb — the hill was
   * asked, and the hill answered yes — and a card written on either says which
   * one it means. Fired after the seam has surfaced, so a rider reading the
   * board sees the ore.
   */
  | 'veinFound'
  /**
   * A hill **surveyed** (`prospectAt`, the vein pass) — strike or barren.
   *
   * The occasion is the *asking*, not the finding, exactly as the assay it pays
   * is (`rules.improvements.assayGold`). A rider that only paid on a strike
   * would be a second rule about what a survey is, and the layer's whole thesis
   * is that certainty is the thing being bought.
   */
  | 'prospect'
  /** A laden caravan destroyed (`settleTraderPlunder`, the trade pass). */
  | 'pillageTrader'
  /** A technology completed (`settleResearch`). */
  | 'tech'
  /** A tile bought (`purchaseTileAt`). */
  | 'tilePurchase'
  /** An augur's rite performed (`performRiteAt`, Entry XXVIII). */
  | 'rite'
  /**
   * A thing **bought** with gold or faith (`purchaseItemAt`, Entry XXIX).
   *
   * The member the comment above says would one day be earned, and Crassus is
   * what earned it: *"−1 happiness for 10 turns after every purchase"* is a card
   * that wants to pay on a purchase and emphatically **not** on a completion — a
   * penalty on buying your way out of a queue is no penalty at all if building
   * the same warrior triggers it. That is the real distinction the note asked
   * for, so this occasion fires *only* from the purchase verb, and
   * `unitCompletion` goes on firing for a bought unit exactly as it did (Rites
   * of Passage is still one row and still pays once).
   */
  | 'purchase'
  /**
   * **This empire declared war** (`declareWarAt`, `diplomacy.ts`) — The Casus
   * Belli's ten turns of fury.
   *
   * The declaring side only, and only against a real empire: `declareWarError`
   * has already refused the wild by the time the war is opened, so there is no
   * clause here about raiders. The seat declared upon is paid nothing — a card
   * that fired for the defender would be a different card, and the design has
   * not written one.
   *
   * It fires on the **declaration**, which is a moment, and what it hangs is a
   * `grant.timed` — so a Casus Belli that was on the bench when the herald rode
   * out sees nothing, and one unslotted the turn after keeps what it already
   * bought. That is `windfallRider`'s ordinary reading of "while slotted" and it
   * is why this is an occasion rather than a standing `atWar` condition: the
   * card pays for *starting* a war, not for being in one.
   */
  | 'declareWar'
  /**
   * **The calendar came round** — a `periodic` Order's own boon, fired by
   * `runPeriodicBoons` when its slot's absolute stamp is reached.
   *
   * The one occasion in the union with no event behind it at all: a chop is a
   * forest felled and a capture is a town taken, and this is simply a turn
   * arriving. It is here rather than outside the vocabulary because the boon *is*
   * a windfall — its figure is composed once, riders and all, before anything is
   * banked (Entry XVIII.5), and a card that says "your boons pay more" is then an
   * ordinary `windfallRider` on this occasion rather than a second kind of thing.
   *
   * Fired once per firing slot, so an empire holding two periodic Orders that
   * come round on the same turn pays two windfalls — the riders ride each.
   */
  | 'periodic'
  /**
   * **A great person was spent on its family's boon** (`greatPersonActAt`) —
   * The Great Poets' quickened years of work and song.
   *
   * `declareWar`'s shape rather than a chop's: the act has no figure of its own
   * here — what a scholar's beakers or an artist's culture come to is composed
   * inside the act itself, ageing and Leonardo's share included (Entry XVIII.5),
   * and banked through that family's own seam — so this occasion pays the
   * **riders and nothing else**, with a base of nought. A card that wanted to
   * scale the act's own figure says `effectAmplifier` at `greatPersonAct`, which
   * is the reading that reaches the arithmetic; this is the moment beside it.
   *
   * Narrowed by `CardWindfallRiderEffect.family`, so "when one of your artists
   * finishes a work" is one row on one occasion rather than five occasions.
   *
   * It fires for the **act** and never for the **work**: a citadel is a thing on
   * the ground and a boon is a moment, which is the same split the amplifier's
   * own docblock states, and `TallyOccasion`'s `greatPersonSpent` already counts
   * both for the cards that mean to.
   */
  | 'greatPersonAct';

/**
 * **What a grant is a share of, where it is a share of the occasion itself.**
 *
 * `RateSource`'s opposite number one shape over: that one reads the empire's own
 * books and this reads the *moment* — how strong the piece was, how many people
 * lived in the town, what the coin actually came to. Four questions, and each is
 * a fact the seam that fired the occasion is the only thing still holding
 * (`WindfallOccasionFacts`, whose members these read).
 *
 * **It is still an Entry XVIII.5 printed number.** A grant scaled by the
 * occasion is a *base* figure entering `windfallPayout`'s one composition, not a
 * second multiplication after it and not a second fold beside it: the measure is
 * read once, `amount` multiplies it, the era and the council multiply that
 * exactly as they multiply a flat grant, and the whole thing is banked once. A
 * rider asking for a measure the occasion cannot supply simply does not ride —
 * `atPopulation`'s silence, said about a figure instead of about a filter.
 */
export type OccasionMeasure =
  /**
   * The **combat strength** of the piece the occasion is about — The Art of
   * War's sword, Songs of the Fallen's dead. Read off
   * `WindfallOccasionFacts.strength`, which the roster's own figure fills at a
   * completion and the fallen piece's fills at a kill or a death.
   */
  | 'strength'
  /**
   * The **citizens** the occasion is about — Triumphs' sacked town, and the same
   * `WindfallOccasionFacts.population` a growth already carries. A capture reads
   * the town as it stood the moment before it changed hands, because a moment
   * later the conqueror's own hand is on it.
   */
  | 'population'
  /**
   * The **coin that actually left the treasury** — Civic Receipts' share of what
   * the town paid for its roof. Read off `WindfallOccasionFacts.gold`, filled by
   * the purchase verb, which is the one place the figure is in hand.
   */
  | 'gold'
  /**
   * **What the occasion itself paid** — Charcoal Burners' share of the timber a
   * felling gave.
   *
   * The occasion's own figure **after the percentage riders have summed and
   * before any one rider's era or council multiplies it**, and that is the
   * design's own ruling rather than a choice made here:
   * `docs/six-decks-first-cut.md` says, of The Woodwrights, *"chop percentages
   * add together before Charcoal Burners reads the payout"*. So a doubled chop
   * pays a doubled tithe, which is the sentence a player reads on the two cards
   * side by side.
   *
   * The cut lands where it does because the two halves are different kinds of
   * fact: the percentages are what *this occasion* came to, and `perAge` /
   * `perSlottedOrder` are facts about the **rider that asked** — a grant scaled
   * by another card's era multiplier would be one card reading another's
   * bargain. Entry XVII's "sum within a stage, apply once" at this scale, and
   * still one printed figure composed before anything is banked.
   */
  | 'payout';

/** What a rider adds on top of the occasion's own payout. */
export interface WindfallGrantSpec {
  /** A voice and an amount — culture on a kill, food on a camp. */
  yield?: CityYieldKey;
  amount?: number;
  /**
   * The figure is **a share of something the occasion itself measures** rather
   * than a number printed on the row — Triumphs' *"culture equal to ten times
   * its population"*.
   *
   * `fromRate`'s sibling, and the pair is the whole of what a scaled grant may
   * read: that one reads the empire's books and this reads the moment. `amount`
   * stops being coins and becomes the **multiplier** — ten times a town's people
   * is `amount: 10` with `fromOccasion: 'population'`, a tenth of the coin paid
   * is `amount: 0.1` with `'gold'` — exactly as `fromRate` turns it into turns.
   *
   * A row carrying both is a row asking two questions of one figure; the
   * occasion's measure is read **first** and the rate is not asked, because a
   * moment is the nearer fact and a row that meant the books would not have
   * named the moment. The two are disjoint in the data by construction.
   */
  fromOccasion?: OccasionMeasure;
  /**
   * **The ceiling on this grant**, in whole units of the voice — Civic
   * Receipts' *"at most 30 culture per purchase"*.
   *
   * Applied to the scaled figure and **before** the era and the council multiply
   * it, which is the only reading that keeps the card's sentence true: "at most
   * 30 culture per purchase" is a cap on what the purchase is worth, and a cap
   * applied after ×era would have printed thirty in Æra I and ninety in Æra III
   * off one clause. It caps a *magnitude*, so a negative grant is capped at
   * −`max` and a card cannot use the ceiling to change a bill into a blessing.
   *
   * Meaningless on a flat grant that never grows, which is a fact about the row
   * rather than a rule here — a row that prints its own figure has already said
   * what the most is.
   */
  max?: number;
  /**
   * The figure is **that many turns of a rate**, read at the moment the occasion
   * fires, rather than a number printed on the row — The Lyceum's *"completing a
   * technology grants an extra turn of culture"*.
   *
   * `amount` stops being coins and becomes **turns**: one turn of culture is
   * `amount: 1` with `fromRate: 'culturePerTurn'`, and an Order whose authored
   * increment carries a second such rider pays two turns — one more ordinary
   * line of the same kind, exactly as every other deepening reads.
   *
   * It is still an Entry XVIII.5 **printed number**: the rate is read once, in
   * `windfallPayout`, before anything is banked — so the preview, the basket and
   * the announcement are one figure, and a card that pays "a turn of culture"
   * cannot pay a different turn's worth to each of them. The rate itself is the
   * *base* one (`foldEmpireRates`, the same reading a `pays` rate takes),
   * which is what stops a card feeding itself.
   */
  fromRate?: RateSource;
  /** Hit points restored to the acting unit. Pillage's, today. */
  heal?: number;
  /**
   * **Renown**, banked to the pool the moment the occasion fires — Triumphs'
   * twenty-five for taking a town.
   *
   * `yield`'s sibling and deliberately its own field rather than a seventh
   * voice: renown is not one of the six (`docs/great-people.md`), it has its own
   * bucket, its own ladder and its own ledger, and a `CityYieldKey` that could
   * spell it would have let every yield-bearing shape in the vocabulary pay a
   * great person by accident.
   *
   * Composed with every other figure on the payout — the era and the slotted
   * count multiply it exactly as they multiply a yield grant (Entry XVIII.5, one
   * printed figure) — and paid in `payWindfallGrants` through
   * `settleRenownWindfall`, which is the one place renown is ever added. So an
   * occasion that fills the ladder opens a great-person offer before the verb
   * returns, exactly as a Triumph does.
   *
   * It feeds no **family**: an occasion is a deed rather than a shelf of
   * buildings, and the draw's bias is a fact about what an empire keeps.
   */
  renown?: number;
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
  /**
   * **Every one of this empire's pieces is healed whole** — The Empire's "taking
   * a city with a wonder in it heals all your units".
   *
   * `heal`'s sibling and deliberately not a number: the ratified text is *heals
   * all*, which is a fact about the army rather than a quantity, and a figure
   * here would have been a second, quieter rule about how much. Paid in
   * `payWindfallGrants`, which is where a payout stops being a preview.
   */
  healAll?: boolean;
  /**
   * A **timed effect hung on the empire**, for `turns` turns — Crassus' bill,
   * which comes due one purchase at a time.
   *
   * `Player.timed`'s only writer's only source, and the shape is the one
   * `City.timed` and `Unit.timed` already use: absolute expiry, ordinary
   * `CardEffect`s, read by the ordinary evaluators, swept by the same broom.
   * What is new is only the *holder* — an empire, because "−1 happiness" under
   * Crassus is a fact about the realm's mood and not about the town that bought
   * the granary.
   *
   * It is a **grant on a windfall** rather than a shape of its own because that
   * is exactly what it is: something an occasion hands over that the occasion did
   * not pay by itself. A rite stamps its own because a rite *is* the occasion.
   *
   * **`renews` is the window reading** (batch C4, Purchased Prosperity). Two
   * different sentences hang a timed effect off a repeatable moment, and until
   * now the vocabulary could only say the first:
   *
   *   · *a bill, one per occasion* — Crassus' unhappiness, which is meant to
   *     pile up, and does, because each purchase pushes another entry;
   *   · *a window, however often the moment comes* — "if you have bought a hex
   *     in the last five turns, your cities are happier", which is one standing
   *     fact with a fresh expiry date and not a stack of them.
   *
   * With `renews`, an entry this same card already hangs on this same holder has
   * its `expiresTurn` **rewritten** instead of a second entry being pushed. That
   * is the discipline every other timed thing in the game keeps — an absolute
   * turn, compared rather than counted down — said about the writer rather than
   * about the broom, and it is the only honest way to write a card whose text is
   * a window: a stacking reading would pay a player who bought three hexes three
   * times for a sentence that promises once. Absent is the bill, which is what
   * every row written before this meant.
   */
  timed?: { turns: number; effects: CardEffect[]; renews?: true };
  /**
   * **A lump of this empire's faith pressed on the towns around the occasion** —
   * The Crusade's, whose soldiers preach with what they have to hand.
   *
   * A *lump* and not a tide, and the difference is the whole of why it is here:
   * the tide (`spreadReligion`) is what a holy site does every turn from where
   * it stands, and this is a thing that happened once, in a place, because
   * somebody did it. That is exactly a windfall — an occasion handing over
   * something the occasion did not pay by itself — so it is a grant beside the
   * coin and the renown rather than a rule of its own, and it is banked through
   * `pressLump`, which is the one routine that presses a lump and converts on
   * the spot. `bankPressure`'s third caller, and the pin says so.
   *
   * `range` is in hexes off the occasion's own tile, so a kill in a rival's
   * heartland preaches to the rival's towns — the whole point of a crusade.
   * An empire that has founded no religion presses nothing, which is the same
   * silence a grant with no city to receive it keeps.
   */
  pressure?: { amount: number; range: number };
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

/**
 * **Where a `pays` line lands.** The first of the shape's two dimensions.
 *
 * `'capital'` is the narrow reading of the town — *once, in one town* — and it
 * exists because an empire line has no basket: `collectYields` banks a realm's
 * gold, science, culture and faith and has nowhere to put food or production, so
 * a row that pays a hammer for a thing counted across the whole realm (The Guild
 * Charter's guilds) has to name a town for it to be built in. Read in
 * `explainCardCityYields` beside the ordinary city lines and skipped by the
 * empire fold, so it is paid exactly once.
 */
export type PayWhere = 'city' | 'capital' | 'hex' | 'empire' | 'route';

/**
 * **What a `pays` line is a figure of.** The second dimension.
 *
 * `'flat'` is the default and is the bag on the row itself. The other four each
 * read something and pay a share of what they read:
 *
 *   · `'count'`  — so many of a counted thing buy one helping (`count`, `per`);
 *   · `'mirror'` — what the buildings of one shelf pay in `from`, paid as `to`;
 *   · `'share'`  — a share of the town's own fold of `from`, paid as `to`;
 *   · `'rate'`   — a rate or a meter standing (`fromRate`), converted per `per`.
 */
export type PayBasis = 'flat' | 'count' | 'mirror' | 'share' | 'rate';

/** What one helping of a counted or converted row pays. See `CardPaysEffect.to`. */
export type PayTarget = CityYieldKey | 'happiness' | 'authority';

/**
 * **Pay a voice** — the one shape, and the one `kind` that moves one of the six
 * voices through `docs/yields.md`'s sequence.
 *
 * Batch **E5** (`docs/audit/e5-yield-shape.md`, `docs/flags.md` (pp)). Eight
 * kinds said one thing — town `pays`, hex `pays`, empire `pays`,
 * route `pays`, `pays` mirror, `pays` count, `pays` share,
 * `pays` rate — and differed only in **where** the figure lands and on what
 * **basis** it is computed. Each carried its own reader, its own describer, its
 * own bot arm and its own row in the yields register, so a ninth way to pay a
 * voice was a shape somebody could add in eight places rather than a decision
 * somebody had to make in one. They are that pair of fields now, exactly as
 * batch H6 folded the four flag-rule kinds into one `rule`.
 *
 * `where` is **required**: it is the question the old kind's *name* was
 * answering, and a default would put it back in the reader's head. `basis` is
 * optional and defaults to `'flat'`, which is what makes a flat row's whole
 * declaration `{ kind: 'pays', where: 'city' }` plus its bag.
 *
 * **Where each pair lands is the sequence of record and did not move**
 * (`docs/yields.md`'s register): the hex at step 2, the town's flats, counts and
 * mirrors at 3, the caravan at 6 and 14, the town's share at 10, a count's
 * percentage at 11, and the empire's flats, counts and rate conversions at 16.
 *
 * **The caravan's count pays the bag** (batch GP2, the (route, count) pair).
 * Every other count says its figure with `to` and `amount`, because every other
 * count pays into a fold that carries one voice at a time; a route's line is a
 * **bag** in `RouteYieldLine` and the road's own fold multiplies bags — which is
 * what `perEndpointLuxury` has always done with a flat row. So a road counted by
 * its length says `per` and its bag, and the helpings multiply the bag exactly as
 * the luxuries at its two ends do. Unambiguous because the pair is fresh: no
 * other (`where`, `basis`) reads the bag on a counted row.
 *
 * **Three fields serve two readings each**, and each pair is disjoint by
 * (`where`, `basis`) rather than by convention:
 *
 *   · **`percent`** is a share in whole percent — of the hex's *works* at
 *     `where: 'hex'`, of the town's fold of `from` at `basis: 'share'`, and of a
 *     voice per helping at `basis: 'count'` (where `stage` is present);
 *   · **`category`** is *which shelf* — the buildings a mirror reads off, and the
 *     buildings `buildingsOfCategory` counts. One question, one field;
 *   · **`per`** is *how many of the thing read buy one helping* — the count's and
 *     the rate's, which were always the same sentence about two readings.
 *
 * `stage` is the discriminant between a count's two payout forms: **present iff
 * the helping pays a percentage**, which is the reading `percentYields` already
 * gives the field, and the flat form has never carried one.
 *
 * A payout to a **meter** (`to: 'happiness' | 'authority'`) carries
 * `where: 'empire'` and nothing reads it: a meter has exactly one bank per
 * empire. It is written down rather than left absent so `where` is total and a
 * reader never has to ask what a blank meant.
 */
export interface CardPaysEffect extends CardYieldBag {
  kind: 'pays';
  /** The town, the capital, the hex, the empire, or the road. Required. */
  where: PayWhere;
  /** How the figure is arrived at. Absent is `'flat'` — the bag above. */
  basis?: PayBasis;

  // --- what is paid, where the bag does not say it -------------------------

  /**
   * The voice (or meter) one helping pays — `basis` `'count'`, `'mirror'`,
   * `'share'` and `'rate'`. The flat basis says it with the bag instead.
   */
  to?: PayTarget;
  /** The flat figure one helping pays. With `to`, on a count or a rate. */
  amount?: number;
  /**
   * A share, in whole percent. **Three readings**, disjoint by (`where`,
   * `basis`) — see the shape's docblock:
   *
   *   · at `where: 'hex'`, a percentage on what the hex's **improvement**
   *     already pays (The Commonwealth's great-person works). It reaches the
   *     improvement's own contribution and nothing else, which is why it is a
   *     field here and not a `percentYields` with a tile scope: a hex's yield is
   *     a list, and a card saying "this hex pays half again" would be silently
   *     multiplying the terrain, the resource, the river and whatever a second
   *     card had already added. Read as one more labelled line of that list, so
   *     the breakdown still sums to the total. A row may carry both a bag and
   *     this; the bag lands first as an ordinary flat and the share is taken of
   *     the improvement's own figure — never of the card's own flat, which would
   *     be a card paying interest on itself;
   *   · at `basis: 'share'`, the share of the town's fold of `from` that is paid
   *     again as `to`, floored per city;
   *   · at `basis: 'count'` **with `stage`**, the percentage one helping adds.
   */
  percent?: number;
  /**
   * A percentage on what the hex's **own ground** already pays — its terrain,
   * the hill or canopy over it, and the seam in it. The Old Ways' doubling.
   * `where: 'hex'` only.
   *
   * `percent`'s opposite number, and the pair is the whole of what a percentage
   * on a hex may say. That one reaches the *works* — the improvement and its
   * renewals — and this one reaches everything that was there before anybody
   * built anything, which is exactly the half The Old Ways is about: *leave the
   * land alone and it pays you*. Neither reaches the other, and neither reaches
   * another card's line, so two cards cannot pay each other interest.
   *
   * Riders sum before one multiplication and the share is floored per voice,
   * exactly as the works' percentage is.
   */
  basePercent?: number;
  /**
   * **Paid once for every mountain standing beside the hex** — Pachacuti's
   * *"farms gain +1 food for each adjacent mountain"* (`docs/leaders.md`).
   * `where: 'hex'` only.
   *
   * A multiplier on this row's own bag rather than a count of its own, and it is
   * `perEndpointLuxury`'s bargain read one ground over: the thing counted is a
   * fact about *the hex*, and nothing in the count vocabulary can **count** a
   * hex's six neighbours — a `CountKind` is asked of an empire or of a town, and
   * `TileCondition` answers yes or no. Since D2a that condition can *ask* about
   * the ring (`beside`), which is a different sentence and deliberately so: a
   * predicate admits the hex once however many peaks stand around it, and this
   * field is what pays a helping apiece.
   *
   * Read off the ground's own baked mark (`Tile.mountainsBeside`, written once
   * at generation), so the peak is counted where the adjacency is already
   * decided and no second walk of the ring of six comes into existence. The bag
   * is multiplied where the line is pushed (`explainTileYield`, `yields/hex.ts`)
   * and lands as **one** labelled entry, so the breakdown still folds to the
   * total; a hex with no peak beside it carries the row at nought and the line
   * simply says nothing, exactly as a zero bag does.
   *
   * The two hex percentages are untouched by it: `percent` and `basePercent` are
   * shares of what the hex *already* pays, and a card that multiplied a share by
   * the mountains would be paying interest on the land twice.
   */
  perAdjacentMountain?: true;
  /**
   * **Paid once for every neighbouring hex that satisfies this** — The Woodland
   * Edge's *"+1 production per adjacent forest, at most +2"*. `where: 'hex'`
   * only, and capped by `max` in helpings.
   *
   * `perAdjacentMountain` generalised, and the older field stays exactly as it
   * is rather than being migrated: that one is answered off the ground's **baked
   * mark** (`Tile.mountainsBeside`, written once at generation, because peaks
   * never move) and this one has to walk the ring, because woods are felled,
   * farms are raised and roads are paved. Two readings of one sentence, each
   * paying for what it can afford — a row carrying both is a row asking for both
   * multipliers, which sum before the bag is multiplied once.
   *
   * The ring is the caller's, exactly as `TileCondition`'s `beside` takes it and
   * for that member's stated reason: a hex is a tile and no map, so the yield
   * chain hands the neighbours down (`TileYieldContext.neighbours`) and **a
   * caller with no ring pays nothing**. The neighbour is asked the ordinary
   * `TileCondition`, so "beside a forest" and "beside an unimproved forest" are
   * the same field with a different condition and nothing new is written the day
   * a card wants quarries.
   *
   * **A `beside` inside this answers no**, the same one-hex reach that member
   * states: the ring is not re-supplied to the neighbour's own evaluation, so
   * the walk is six hexes and cannot become a flood fill.
   *
   * The bag is multiplied where the line is pushed and lands as **one** labelled
   * entry, `perAdjacentMountain`'s own arithmetic, so the breakdown still folds
   * to the total; a hex with nothing beside it carries the row at nought and the
   * line simply says nothing. The two hex percentages are untouched by it, for
   * that field's reason — a share of what the land already pays, multiplied by
   * the ring, would be paying interest on the ground twice.
   */
  perNeighbour?: TileCondition;
  /** Which of Entry XVII's stages a counted percentage joins. Its discriminant. */
  stage?: ModifierStage;

  // --- what is read ---------------------------------------------------------

  /** The voice read — `basis: 'mirror'` (off the shelf) and `'share'` (the fold). */
  from?: CityYieldKey;
  /** The rate or meter standing read — `basis: 'rate'`. See `RateSource`. */
  fromRate?: RateSource;
  /** What `basis: 'count'` counts. See `CountKind`. */
  count?: CountKind;
  /**
   * How many of the thing read buy one helping. Default 1.
   *
   * The count's and the rate's, which is one question: "so many luxuries buy a
   * coin" and "so much faith a turn buys a beaker" are the same sentence about
   * two readings.
   *
   * **And the ring's** (batch C2): at `where: 'hex'` with `perNeighbour`, how
   * many answering neighbours buy one helping — Mining Districts' *"+1 gold and
   * +1 science for every two adjacent mines"*. That is the third reading of one
   * question, and it is a reading of this field for `max`'s reason exactly:
   * `max` already caps the helpings at both of those places, the two can never
   * be asked of one row, and a divisor is a divisor. The division floors, so a
   * hex with one mine beside it under a divisor of two is paid nothing.
   */
  per?: number;
  /**
   * **The ceiling.** Two readings, disjoint by `basis` — the shape's own idiom:
   *
   *   · at `basis: 'count'` (and at `where: 'hex'` with `perNeighbour`), the
   *     most **helpings** that ever pay;
   *   · at `basis: 'share'`, the most the line ever pays at all, in whole units
   *     of `to`, **per city** — The Learned Patron's *"at most +12 science per
   *     city"*.
   *
   * A share has no helpings to cap, which is what makes the second reading a
   * reading of this field rather than a field of its own: the two can never be
   * asked of one row, and a ceiling is a ceiling. Applied after the floor, so a
   * town whose culture is worth eleven and a half beakers is capped at what it
   * actually earns rather than at what it rounded from.
   */
  max?: number;

  // --- the counts' arguments ------------------------------------------------

  /** Which building `buildingsOfKind` counts. Ignored by every other count. */
  building?: BuildingId;
  /**
   * Which shelf. **Two readings, one question**: the buildings a
   * `basis: 'mirror'` row reads its `from` off, and the buildings
   * `buildingsOfCategory` counts.
   *
   * On the shape rather than in a union for the stated reason — the count union
   * stays a list of *questions* and the row says which one it is asking.
   */
  category?: BuildingCategory;
  /**
   * Which categories `buildingsOfCategories` counts. `category`'s sibling one
   * grade wider. An absent or empty list counts nothing — see the count.
   */
  categories?: BuildingCategory[];
  /** Which units `unitsInField` counts. Absent counts every piece. */
  class?: UnitFilter;
  /**
   * Which hexes `tilesInBorders` counts — the ordinary `TileCondition` (batch
   * C2). Absent counts nothing; see the count.
   *
   * Named apart from `on`, which is the hex a `where: 'hex'` line *lands on*.
   * The two are different questions — one says where a yield is paid and this
   * says what is being counted — and a row could honestly carry both (a hex
   * line paid per mine in its own town), so one field serving both would have
   * been a collision rather than a double duty.
   */
  tile?: TileCondition;
  /**
   * Which flavour `slottedOrdersOfSlot` counts. Absent counts every slotted
   * Order whatever its flavour, which is the honest reading of an unnamed
   * argument rather than a guard.
   */
  slot?: SlotType;
  /**
   * Which moment `tally` counts. A `tally` row that names no occasion counts
   * nothing at all — the honest answer for a card that never said what it was
   * watching, rather than a guard that would quietly count everything.
   */
  tally?: TallyOccasion;
  /**
   * Which voice `empireYield` reads. Absent counts nothing, which is the honest
   * answer for a ledger question that never said which column.
   */
  voice?: CityYieldKey;
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

  // --- where it lands -------------------------------------------------------

  /**
   * The hex's own condition — `where: 'hex'`, and required there. The one field
   * that reaches into `explainTileYield`, and therefore the one that has to obey
   * rule 5 at the hex.
   */
  on?: TileCondition;
  /**
   * Which towns admit it. Absent means every one.
   *
   * At `where: 'hex'` it is whose *ground*: the hex pays only if its **owning
   * city** is admitted. Petra's desert and the Hanging Gardens' farms are both
   * "in this city", which a wonder says the way every other wonder clause says
   * it — `hasBuilding` on its own row, derived from the board, so a captured
   * wonder moves its ground bonus with it. It is read where the *town* is known
   * (`cityContext`) rather than in the empire-wide pass, for the granary's
   * reason exactly: a fact about one city can only be resolved by whoever has
   * one in hand, and a hex outside anybody's borders has no city to ask.
   */
  scope?: CityScope;
  /**
   * Which origin towns' caravans carry it — `where: 'route'`. Absent reaches
   * every route this empire sends.
   *
   * Asked of the town the caravan **left**, which is what makes the Caravanserai
   * a hub rather than a nationwide subsidy: *"routes originating here +1🌾 +1⚒"*
   * is `origin: { test: 'hasBuilding', building: … }`, one ordinary `CityScope`
   * and no field of its own.
   */
  origin?: CityScope;
  /**
   * Which **destination** towns' caravans carry it — the Printing House's
   * beakers, paid for the roads that end at its presses.
   *
   * `origin`'s twin, asked of the town the caravan is walking *to*. Which
   * **books** the line lands in does not move: a domestic route's whole figure
   * is banked by its destination and a route ending abroad carries its lines in
   * the sender's fold, so a card of this empire's still never pays a foreign
   * host. The row is read off the **origin's** empire either way, which is the
   * module's own rule — a route belongs to the seat that sent it — so a rival's
   * presses do not print your books.
   */
  destination?: CityScope;
  /**
   * **Either of the two towns will do** — Pilgrim Markets' *"routes gain +2 gold
   * and +2 faith if either endpoint contains a Holy Site"* (batch C8).
   *
   * `origin` and `destination` are two clauses joined by *and*: a row carrying
   * both pays only a road whose two ends both answer. This is the *or*, and it
   * is a third field rather than a flag on the other two because it is a
   * different question — "one of these two towns has a shrine" cannot be written
   * as a predicate over either town alone, in the same way `crossing` cannot.
   *
   * **It pays once whatever happens**, which is the card's own second sentence.
   * The row is admitted or it is not; a road with a holy site at both ends is
   * one admitted road and carries the bag once. A card that wanted to pay per
   * qualifying end would be counting, and would say so with a count.
   *
   * A row that names it and is asked about an origin with **no far end in hand**
   * — a preview of a road nobody has drawn — admits nothing, exactly as
   * `destination` and `crossing` do there and for their reason: a line the
   * preview promised and the caravan never paid is a lie about a price.
   *
   * It composes with the other three: a row may say `eitherEnd` and `crossing`
   * and mean "a domestic road with a shrine at one end of it".
   */
  eitherEnd?: CityScope;
  /**
   * A **share of what the road already carries**, voice by voice — The Silk
   * Exchange's doubled beakers and songs. `where: 'route'`.
   *
   * The bag puts yields *on* the caravan; this multiplies what is on it, which
   * is the ordering the whole fold is built around ("put yields on a thing, then
   * multiply the thing"). It is on this shape rather than an `effectAmplifier`
   * for one reason: that target (`routeYields`) is the whole caravan and cannot
   * say *which voice*, and a card that meant to double the beakers would have
   * doubled the grain with them.
   *
   * A list, because a row that raises two voices is one clause on a card and
   * reads as one line in the fold. Every share on one route sums per voice
   * before a single multiplication, and each voice is floored once — Entry
   * XVII's rule at the scale of a road.
   */
  share?: CardRouteShare[];
  /**
   * **Paid once for every luxury held at either end of the road** — The Golden
   * Roads' *"+1💰 from each luxury resource in the origin or destination city"*.
   * `where: 'route'`.
   *
   * A multiplier on this row's own bag rather than a count of its own, because
   * the thing counted is a fact about *the route* and nothing else in the
   * vocabulary can see both ends of one. Counted as the **union** of the two
   * towns' luxuries, once each: a vineyard at both ends of a road is one wine,
   * not two — the reading *"in the origin or destination city"* takes literally,
   * and the one that cannot be farmed by pointing a caravan at a mirror of its
   * own hinterland. Folded in `routeYields.ts`, the only module holding both
   * cities.
   */
  perEndpointLuxury?: true;
  /**
   * **Which side of a border the road has to cross** — The Silk Road's coin on a
   * caravan sent abroad, and Daughter Cities' grain on one that never leaves.
   * `where: 'route'`.
   *
   * `origin` and `destination` ask about the two *towns*; this asks about the
   * **pair**, which is the one question neither of them can answer: a scope is a
   * predicate over one city and "the two ends belong to different empires" is a
   * fact about both at once. It is `routeIsInternational` (`routes.ts`) either
   * way round, so a card and the two folds cannot disagree about what a foreign
   * road is.
   *
   * Absent reaches every road this empire sends, which is what every row written
   * before it meant. A row that names a crossing and is asked about an origin
   * with **no far end in hand** (a preview of a road nobody has drawn) admits
   * nothing, exactly as a `destination` clause does there and for its reason: a
   * line that answered yes would be a line the preview promised and the caravan
   * never paid.
   */
  crossing?: 'domestic' | 'international';
  /**
   * **The road has been running at least this many turns** — Established Routes'
   * *"renewed routes pay 50% more"* (batch D2d, the age stamp). `where: 'route'`.
   *
   * `crossing`'s sibling and a filter on the *caravan* for its reason exactly: a
   * road and a road kept up for a season are one question asked two ways. Read
   * off `TradeRoute.startedTurn` — an absolute stamp written once when the route
   * opens and never rewritten by a renewal — so the figure is
   * `state.turn - startedTurn` and **nothing ticks**. Everything that really ends
   * a route destroys `Unit.trade` itself, so a road that lapsed, was plundered or
   * lost its partner starts its term over, which is what "kept up" means.
   *
   * Absent reaches every road this empire sends, which is what every row written
   * before it meant. A row that names a term and is asked about an origin with
   * **no caravan in hand** — a preview of a road nobody has drawn — admits
   * nothing, exactly as a `crossing` clause does there and for its reason: a line
   * the preview promised and the caravan never paid is a lie about a price.
   */
  standingTurns?: number;
  /**
   * **The two towns are at least this many hexes apart** — Venture Routes' long
   * haul (batch C3). `where: 'route'`.
   *
   * `crossing`'s and `standingTurns`' third sibling: a fact about the *pair*
   * that neither end's scope can answer. The distance is `routeHexes`
   * (`routes.ts`), the one reading of how far apart two towns are — the wrapped
   * map distance, not the path a cart walks, so the seam of a wrapping map is
   * not a wall and the figure is the same for a road running and a road being
   * considered.
   *
   * **Carried rather than resolved**, which is `CardRouteLine.perHexes`' bargain
   * exactly: this module holds the law and the fold in `routeYields.ts` holds
   * both ends, so the threshold comes through as a number and the fold does the
   * measuring. Unlike `crossing` and `standingTurns`, a preview with no far end
   * in hand is therefore not refused here — the fold with both ends is where the
   * row is dropped.
   *
   * The figure is the **lowest distance that qualifies**, so a card whose words
   * are "more than fourteen hexes apart" carries fifteen.
   */
  minHexes?: number;
  /**
   * **Which medium the road takes** — The Harbour Chain's coin by the mile, paid
   * on the water and nowhere else (batch C7). `where: 'route'`.
   *
   * `crossing`'s fourth sibling, and it is the same kind of narrowing: a fact
   * about the *road* that neither end's scope can answer. The board has always
   * known it — a route is entirely a land route or entirely a sea route
   * (`TradeRoute.sea`, read through `routeMode`), and the fold that prices one
   * has been handed the mode since batch R1 for the sea premium — so nothing new
   * is decided here. What is new is only that a card may say the word.
   *
   * Absent reaches both media, which is what every row written before it meant.
   * The mode is handed down from `explainRouteYieldBetween` and its sender twin,
   * both of which already take it; a caller that names none is treated as land,
   * which is the same conservative default those folds have always had — so a
   * preview of a pair before a mode has been chosen is never promised a sea
   * line it has not earned.
   *
   * A card that wants a **longer** sea route is not this field: range is not a
   * yield, and it says so with `CardRule`'s `seaRouteRange`.
   */
  mode?: RouteMode;
  /**
   * **Who this line pays, when it is not the empire holding the card** — The
   * Common Road's coin to the town its caravan reaches, The Foreign Factor's to
   * the town its house stands in (batch D2e, the bilateral grant).
   *
   * Absent on every row written before this one and on almost every row since,
   * and absent means what it has always meant: a card pays the empire that holds
   * it. This is the exception, not a widening of the rule — a reader that does
   * not mention `payee` is reading the common case and is still correct.
   *
   * `'host'` means a different empire's books, and which town those are is
   * decided by `where`:
   *
   *   · `where: 'route'` — the **town the caravan is walking to**, whoever owns
   *     it. The destination fold (`explainRouteYieldBetween`) already lands in
   *     that town's own sheet and its owner's bank, so the line arrives inside
   *     the payee's own explanation rather than beside it, which is rule 5. On a
   *     domestic trade route the host is one of your own towns and the row pays it
   *     there; a card that means "abroad" says `crossing: 'international'`.
   *   · `where: 'city'` — **every foreign town holding this empire's paying
   *     commercial post** (`cityPostPays`, `routes.ts`). Foreign only, which is
   *     what makes the field mean one thing: a row that wants to pay your own
   *     provinces for holding your house is an ordinary `where: 'city'` row
   *     scoped `holdsPost` and needs no payee at all. The town's own
   *     `City.posts` is the index of who might pay it, so a town no foreign
   *     house stands in costs nothing to ask.
   *
   * No other `where` reads it, and a row that names one is refused by the
   * register test rather than quietly paying its own empire. A row carrying it
   * is read **only** by the payee's fold — the ordinary passes skip it — so
   * there is no arrangement under which one row pays twice.
   *
   * **The premium and the amplifier stay home.** A host grant is not raised by
   * the sea premium, by a share, or by a law that multiplies "your trade route
   * yields" — those are the sender's dials on the sender's goods, and the
   * design says so outright (*"ordinary sea premiums apply to route yields, but
   * not a second time to an explicit host grant"*). A blockade at either end
   * still takes it back, because a shut harbour trades with nobody.
   */
  payee?: 'host';
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
   * Narrows a unit bonus by the **ordinary `UnitFilter`** — The Shipwright
   * Shores' ships, and The Dry Docks'.
   *
   * `modelClass` is the silhouette shorthand every row written before this field
   * uses, in four tables this module may not edit, and `class: { modelClass: … }`
   * says exactly the same thing — so the two are one question and the older
   * spelling stays rather than being migrated across the tree, the roster, the
   * wonders and the great people at once. What the filter buys is the sentences
   * a silhouette cannot say: "ships" is *three* model classes (`navalLight`,
   * `navalHeavy`, `navalRanged`), and three rows saying a third of one card each
   * is exactly the drift `unitMatches` exists to prevent.
   *
   * Read by that same predicate, beside `modelClass` and never instead of it: a
   * row carrying both must satisfy both, which is the reading every other pair
   * of narrowings on this shape takes.
   */
  class?: UnitFilter;
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
  /**
   * Narrows the bonus to **one named row** — Mimar Sinan's mosques.
   *
   * `modelClass` narrows a unit bonus to a silhouette and this narrows a
   * building bonus to a building, which is the same idea on the other half of
   * the roster. It is asked only of the row being built, so a bonus carrying it
   * is meaningless on a category nothing names (a project, a unit) — a fact
   * about the row rather than a rule here.
   *
   * A card that wants "every science building" says `category` and the day the
   * design wants a *class* of building narrower than a category, that is a
   * `BuildingCategory` decision in the table rather than a list here.
   */
  building?: BuildingId;
  /**
   * Narrows the bonus to buildings of one **category** — The Encyclopaedia's
   * "science buildings cost −50%".
   *
   * `building`'s sibling one grade wider, and it takes its argument the way
   * `CardPaysEffect.category` does: that field names one row, this names
   * what a row is *for* (`BuildingDef.category`, the one word every building
   * declares). So a second science building is a JSON row rather than an edit
   * here — the reason it is the category and not a list.
   *
   * Named `buildingCategory` rather than `category` because that word is already
   * this shape's `ProductionCategory`, which is a different question: one says
   * *which queue rows* (unit, building, wonder, project) and this says *which
   * buildings among them*.
   */
  buildingCategory?: BuildingCategory;
  /**
   * Narrows the bonus to the realm's **single great houses** — The Land's Great
   * Work, The Merchant Works, and Scientific's Institutions line.
   *
   * `buildingCategory`'s sibling one class over, and a **marker rather than a
   * fifth `ProductionCategory`**, which is the one judgement this field is. A
   * production category is what kind of *queue row* is being built (unit,
   * building, wonder, project) and every reader of that union — the queue, the
   * purchase gate, the bot's appraisal, the Compendium — switches on it
   * exhaustively; an empire building is a **building** by every one of those
   * readings, and a fifth member would have made `category: 'building'`
   * ambiguous in each of them (does it still include the Forum?) for one
   * narrowing on one shape. So it sits here beside the two narrowings that are
   * already about *which building among the buildings*, and reads the marker the
   * rows already carry (`BuildingDef.oncePerEmpire`, `CityScope`'s
   * `hasEmpireBuilding` one question over).
   *
   * Asked only of the row being built, exactly as `building` is, so a bonus
   * carrying it says nothing about a unit or a project. A wonder is **not** one
   * of these — the two classes are separate by the marker's own reading — and a
   * card that means both says so with two rows.
   *
   * **`false` is the other half of the question** (batch C4, Private Patronage):
   * an *ordinary* building is one the marker is absent from. It is a boolean
   * rather than a `true` for `CardWindfallRiderEffect.empireBuilding`'s reason
   * exactly — that field has been a boolean since it was written, and a card
   * whose whole sentence is "everything except the great houses" has no other
   * way to say so, because there is no `not` anywhere in this vocabulary and
   * there will not be one. Absent still reaches every building, which is what
   * every row written before this meant.
   */
  empireBuilding?: boolean;
  /**
   * **A share per helping of something counted** — The Great Consecration's
   * *"+5% toward the Magnum Opus for every foreign city that follows you, at
   * most +40%"*, and The World's Exchange's roads.
   *
   * `percent` is the figure **one helping** adds where this is present, and the
   * flat reading where it is not — the discriminant `CardPaysEffect`'s counted
   * percentage already uses (`stage`, present iff the helping pays a share).
   * Every helping sums before Entry XVII's one multiplication, which is what
   * `cardProduction` returning a **list** has always guaranteed: a counted bonus
   * is one labelled line whose figure is `percent × helpings`, never a second
   * multiplication after the first.
   *
   * Answered by `countOf` — the simulation's own counting question, the very
   * reading the yields and the renown trickle ask — so a card counting a
   * congregation for hammers and a card counting it for coin cannot disagree
   * about how big it is. A row naming no count keeps the flat reading, which is
   * what every row written before this field meant.
   */
  count?: CountKind;
  /** How many of `count` buy one helping of `percent`. Default 1. */
  per?: number;
  /** The most helpings that ever pay — The Great Consecration's eight. */
  max?: number;
}

/** A percentage on a named rule. See `CardRule`. */
export interface CardRulePercentEffect {
  kind: 'rulePercent';
  rule: CardRule;
  percent: number;
  /**
   * Which towns the rate applies in. Absent means the realm, which is what a
   * Doctrine's rate has always meant.
   *
   * The scope the 2026-08-28 ruling asked for and Common Table's whole home: *a
   * city that follows keeps a quarter of its stored food when it grows*. Read
   * in `cardRulePercent`, which already took an optional city for the borders
   * channel — a rate narrowed to towns is answerable only by a caller holding
   * one, so a scoped line is silent to every caller that passes none.
   *
   * It is the ordinary `CityScope` and nothing narrower, so an Order may say
   * "faster borders in captured cities" on the same terms tomorrow.
   */
  scope?: CityScope;
}

/** Flat happiness, once for the empire or once per city a scope admits. */
export interface CardHappinessEffect {
  kind: 'happiness';
  amount: number;
  per?: 'city';
  scope?: CityScope;
  /**
   * **The line stands on a building rather than on the town** — Feast Days'
   * *"Temples supply +1 happiness"* (the user's mark of 2026-09-08: *"modify, so
   * that this is affected by temple multipliers"*).
   *
   * `cardLinesOnBuilding`'s bargain one meter over. A town `pays` naming a
   * building in its scope is already folded into that building's own figure —
   * which is what lets the Synod's share reach a belief's science on a temple —
   * but happiness is not a voice (`CityYieldKey` has no member for it), so the
   * yield path could not carry it and a share of it has nothing to multiply
   * *yet*. What the field buys today is the **attribution**: the line leaves
   * `cardHappiness` and is folded by `buildingHappiness` (`buildingEffects.ts`)
   * onto the row it names, so the happiness ledger says "Uruk · Temple" — a
   * thing standing in a named town that a player may be about to lose — instead
   * of naming the law that put it there. The day a card says "your temples are
   * twice as glad", that share has one figure to take.
   *
   * The scope is still asked and is still what admits the town: a row carrying
   * this says `hasBuilding` too, because the attribution is *which* line the
   * happiness hangs on and the scope is *whether* it is paid at all.
   */
  building?: BuildingId;
}

/** Flat authority capacity. Capacity, never a discount — `resourceAuthority`'s rule. */
export interface CardAuthorityEffect {
  kind: 'authority';
  amount: number;
  per?: 'city';
  /**
   * **Which towns are counted**, on a `per: 'city'` line — The Tribute Road's
   * provinces at the end of a road, and The Great Yangtze's on the water.
   *
   * The ordinary `CityScope`, read by the ordinary evaluator, so "the towns a
   * road reaches" means here exactly what it means in the treasury and on a
   * yield line. It is a narrowing of the **count** and nothing else: capacity is
   * still capacity (`cardAuthority`'s own rule — a card that wants cities
   * *cheaper* says so with a `meterRule`), and a figure paid per admitted town
   * is the honest way to say "these ones cost you less to hold" without
   * inventing a second discount on the meter.
   *
   * Meaningless without `per: 'city'`, and ignored there: a flat capacity is a
   * fact about the realm and has no town to ask about. Absent counts every town,
   * which is what every row written before it meant.
   */
  scope?: CityScope;
  /**
   * **The ceiling, in capacity** — The Provincial Chancery's *"at most +8"*, The
   * Great Chancery's twelve.
   *
   * A cap on the **writ the line supplies**, not on the towns counted, and the
   * difference matters the moment `amount` is more than one: The Great Chancery
   * pays two a town to a ceiling of twelve, which is six towns and not twelve.
   * So it is applied to the product exactly as a player reads the card, and the
   * label still says how many towns were counted — a hover that capped silently
   * is the one thing `explainAuthority` exists to prevent.
   *
   * Meaningless without `per: 'city'` and ignored there, for `scope`'s reason: a
   * flat capacity is already the figure the card prints and a ceiling on it
   * would be a second way to write the same number.
   */
  max?: number;
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
   *   · `'foreignTerritory'` — anywhere else, which includes ground nobody has
   *     claimed. `ownTerritory`'s mirror and a named value for `notFreshwater`'s
   *     reason exactly: there is no negation composite and there will not be
   *     one, so a reading the ratified table actually asks for earns its own
   *     word. The Wintering Grounds' mending, and the same reach
   *     the `noHealAbroad` rule already takes — a hex nobody owns is
   *     outside your borders, which is what makes the clause bite on a campaign
   *     rather than only in a rival's homeland.
   *   · `'embarked'` — on water, which for a piece that is on the board at all
   *     means it embarked to get there (`isEmbarkableTerrain`, Entry XXVII).
   *     The Great Lighthouse's extra point of movement at sea.
   *   · `'fortified'` — the piece has dug in (`Unit.fortifiedTurns`, presence is
   *     the state). The Alchemical Codex's extra mending, and the only one of
   *     the three that is a fact about the *posture* rather than the ground.
   *   · `'grassOrPlains'` — **the open country**: flat or hilled grassland and
   *     plains, the two terrains a horse runs on. Modu Chanyu's extra pace,
   *     which `docs/leaders.md` gives as "+1 movement on grassland and plains".
   *
   * All four are asked of the piece where it stands, in `cardUnitStat`, which
   * is the only reading a per-turn allowance can have: a ship is quick because
   * it set out from the water, and the allowance is refilled where it stands.
   *
   * That reading is also the **answer to the obvious other one** — an extra
   * point that may only be spent *entering* the open country. There is no such
   * thing in this game and there must not be: `stepCost` returns one number,
   * the four readers subtract it from one purse, and `snapMovement` keeps that
   * purse a whole number of fifteenths. A point that could only be spent on
   * some steps would be a second currency and a fifth pricer, which is exactly
   * what the movement trap forbids. So the steppe is read where the ship's
   * water is read: a column that sets out across the grass rides further that
   * turn, and one that wakes up in the hills does not.
   */
  where?: 'ownTerritory' | 'foreignTerritory' | 'embarked' | 'fortified' | 'grassOrPlains';
  /**
   * Narrows the stat to *the town the piece was trained in*. Absent means every
   * one. Cuius Regio's augurs, raised in the cities that keep his faith.
   *
   * `CardRulePercentEffect.scope`'s bargain, and it is taken here for that
   * field's stated reason: **a scoped line is silent to every caller that
   * passes no town**. Only `cardExtraCharges` has one — a charge is written at
   * the *birth*, so the hex the piece is born on is the town that raised it —
   * and the per-turn readings (`cardUnitStat`, `cardCombatPercent`) are asked of
   * a piece on the march, which has no town at all. That is the honest reading
   * rather than an omission: "trained in a city that follows you" is a fact
   * about a moment, and a movement allowance is a fact about a hex.
   */
  scope?: CityScope;
  /**
   * Narrows the stat to **one kind of fight** — the Statue of Zeus' fifteen
   * percent for storming a town.
   *
   * Read by exactly one of this shape's readers, `cardCombatPercent`, which is
   * the only one asked inside a fight and therefore the only one holding a
   * `CombatSituation` to put the question to. Every other reading of a
   * `unitStat` is asked of a piece standing on a hex with nobody opposite it,
   * and **a line carrying a `when` is silent to all of them** — `scope`'s
   * bargain one field over, taken for that field's stated reason: it is the
   * honest reading rather than an omission, because "when you attack a city" is
   * a fact about a moment and a movement allowance is a fact about a turn.
   *
   * There is no `side` here and none is needed: a defending piece's situation
   * never carries a city on the other side (`vsCity` is what the *target* is),
   * so a row written `{ test: 'vsCity' }` pays on the assault and nowhere else.
   */
  when?: CombatCondition;
}

/**
 * Something written onto a unit **at the moment it is created**, and true of
 * that piece for the rest of its life — The Muster Roll's ten hit points, Drums
 * of War's point of strength.
 *
 * `CardUnitStatEffect`'s opposite number, and the split is worth stating because
 * the two shapes look alike and mean different things. A `unitStat` is a
 * *standing reading of the board*: ask it every turn and it answers what the
 * cards say today, so unslotting the Order slows the legion down again. A stamp
 * is a **moment** — the card was live when the levy mustered, and the levy is a
 * levy of veterans whatever the council does next year. That is exactly what the
 * ratified text says ("newly created units gain …"), and it is the argument
 * `unitStat`'s `charges` arm already makes for the one stat that could not be
 * read live.
 *
 * So it is written where a card is already read at a birth — `createUnit`
 * (`state.ts`), the one place a piece comes into existence — into
 * `Unit.stamp` (presence is the state, `chargesLeft`'s convention). Every
 * creation is stamped: a completion, a purchase, a wonder's grant, a ruin's
 * escort. Both fields have exactly one reader apiece and neither is a
 * multiplier: `unitMaxHp` folds the hit points into the roster's maximum, and
 * `planCombat` folds the strength in as one labelled line ("Veteran +1") on
 * whichever side the piece is standing (`unitData.ts`).
 *
 * It is deliberately **not** in the piece fingerprint (`signUnits`, `pieces.ts`):
 * nothing a stamp changes is drawn. The hp bar reads a *fraction* and the
 * strength is a number on a forecast card, so a stamped warrior and a plain one
 * are the same sculpt — which is the fingerprint's own test ("any new
 * visual-affecting unit property"), answered no.
 */
export interface CardUnitStampEffect {
  kind: 'unitStamp';
  /** Hit points every unit created while this is live is born with. */
  hp?: number;
  /** Strength points it carries into every fight, both sides. */
  strength?: number;
  /**
   * Movement points every unit created while this is live is born with — The
   * Charter Fleet's hulls, which are bought at sea and keep the extra league for
   * the rest of their lives.
   *
   * `hp`'s sibling in every respect, and the field was missing here rather than
   * missing from the game: `UnitStamp.movement` has existed since The Levée en
   * Masse, is written by `periodicMuster`'s own `stamp`, and is read by the one
   * evaluator of an allowance (`fullMovement`), so a piece marked here is
   * already quoted correctly by every reader of a step's price. What this adds is
   * the *card* half — the third of the three marks a birth can carry, written the
   * way the other two are and folded in the same loop.
   *
   * The card that asked for it is the one the design revised **towards** the
   * shape: The Charter Fleet used to promise its hulls a keener lookout, which is
   * the one mark a piece cannot carry, and the sheet now promises them a longer
   * league instead. A stamp is written once at the birth, so a fleet already at
   * sea when the Order is slotted gains nothing.
   */
  movement?: number;
  /**
   * Narrows the stamp to **the town the piece was raised in** — the Terracotta
   * Army's "units built in this city".
   *
   * `CardUnitStatEffect.scope`'s field one shape over, read the same way by the
   * same predicate against the same town: the birth hex is the only town a
   * creation has, and `createUnit` is the one place a piece comes into
   * existence. A wonder says "here" by naming itself
   * (`{ test: 'hasBuilding' }`), which is the same sentence its town `pays`
   * clauses already say — so a stamp that reaches one town and a yield that
   * reaches one town are one vocabulary.
   *
   * **A stamp with a scope is silent where there is no town at all**: a piece
   * created off the board (a ruin's escort on open ground) is born unstamped by
   * that row, which is the honest reading of "built in this city" rather than a
   * quiet default to everywhere.
   */
  scope?: CityScope;
  /**
   * **Which pieces are stamped** — Mercenaries' military line (the user's orders
   * pass, `docs/flags.md` (xxx) mark 14).
   *
   * The day `cardUnitStamp`'s docblock said would come: the ratified rows all
   * said *newly created units* until one said *military units bought with gold*,
   * so the ordinary `UnitFilter` joins the shape and is asked beside
   * `unitMatches` like every other narrowing. Absent stamps every piece, which
   * is what The Muster Roll and Drums of War have always meant.
   */
  class?: UnitFilter;
  /**
   * **Only a piece bought out of this bank** — Mercenaries' hired sword, which
   * is a different animal from a levy the countryside raised.
   *
   * `scope` narrows *where* a piece was raised and this narrows *how it was paid
   * for*, which is the one fact about a birth that the town, the roster and the
   * hex all fail to carry. It travels the way `scope`'s town does — handed down
   * from the seam that knows (`purchaseItemAt` → `RealiseOptions.bought` →
   * `createUnit` → `cardUnitStamp`) — rather than being read back out of the
   * cards at the purchase seam, because `statecraft/evaluator.ts` is the only
   * module that may switch on a `CardEffect.kind`.
   *
   * A row naming a bank is silent at every other birth: a completion, a wonder's
   * grant, a ruin's escort and a purchase out of the *other* bank all leave it
   * unstamped, which is the honest reading of "bought with gold". Absent stamps
   * every birth, bought or built.
   */
  bought?: 'gold' | 'faith';
}

/**
 * A **fact about a city** that a card simply declares to be true — Cistern
 * Works, whose aqueducts mean every town of the realm can drink.
 *
 * `MeterRuleId`'s pattern one system over, and it is a shape rather than a
 * `CityScope` because it works in the other direction: a scope *asks* whether a
 * town has fresh water, and this *answers*. So the rule is read inside the one
 * predicate every such question already goes through (`cityHasFreshwater` in
 * `statecraft.ts`, which is what `cityScopeAdmits`' `freshwater` and
 * `notFreshwater` arms consult), and a card, a river and a lake are one answer.
 *
 * It reaches the questions asked of a **town** and deliberately not those asked
 * of a **hex**: a farm beside a river is a fact about the ground under the farm
 * (`TileCondition`'s `freshwater`, the renewal's `requiresFreshwater`, the
 * improvement gate's waiver), and a cistern in the town square does not water
 * the third ring. That is the honest split rather than a silence, and the row
 * says so in its own words.
 *
 * The shape it is said in is `CardRuleEffect` (`"kind": "rule"`) since batch H6:
 * `cityRule` was one of four flag kinds that were one evaluation apiece. What
 * survives is the id union, which is the typed door `cityHasFreshwater` knocks
 * on.
 */
export type CityRuleId = 'freshwater';

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
  /**
   * The rider fires only when **this empire's own piece** was the one that did
   * it — Mithridates' Pontic peltast, which mends on a kill where the rest of
   * the army does not.
   *
   * `vsBarbarians`' mirror: that one narrows the occasion by who was on the
   * *other* side and this narrows it by who was on *this* one, and both are
   * filters on one moment rather than a second occasion. The same `UnitFilter`
   * every "which units" question in this file asks, read by the same
   * `unitMatches` predicate — so a rider written for one row keeps meaning what
   * it said, and a rider written for a silhouette reaches whatever the roster
   * draws that way.
   *
   * Read against `WindfallOccasionFacts.actor`, which the caller passes for
   * `vsBarbarians`' reason exactly: by the time the riders are composed the
   * fight is over and the board no longer says whose blow it was. An occasion
   * that carries no actor at all — a growth, a town founded — never satisfies
   * it, which is what keeps a row written onto the wrong occasion silent rather
   * than universal.
   */
  class?: UnitFilter;
  /**
   * The rider fires only when the town taken **held a wonder** — The Empire's
   * "capturing a city with a wonder heals all your units".
   *
   * `vsBarbarians`' sibling and a filter on the *occasion* for its reason
   * exactly: a capture and a capture-of-a-wonder-city are one moment asked two
   * ways. Read where the occasion is fired (`applyCombat`'s capture path), which
   * is the only place that still knows what stood in the town — by the time the
   * riders are composed the city is the captor's and its buildings are simply
   * his. Meaningless on any other occasion, which is a fact about the row.
   */
  capturedWonder?: boolean;
  /**
   * The rider fires only when the town **grew to exactly this population** —
   * First Fruits' "the first citizen born in each city pays +10 faith once".
   *
   * `vsBarbarians`' and `capturedWonder`'s third sibling, and a filter on the
   * *occasion* for their reason exactly: a growth and a growth-to-two are one
   * moment asked two ways, and the caller (`payGrowthRider`) is the only thing
   * that knows which citizen this was. Read off
   * `WindfallOccasionFacts.population`, so a rider that asks for a figure the
   * occasion cannot supply is simply not on that payout — meaningless on any
   * occasion but a growth, which is a fact about the row rather than a rule
   * here.
   *
   * **"Once" is the board's word, not a ledger's.** Nothing is written down
   * about a town that has already paid: the card fires whenever a town reaches
   * the stated size, which for the only figure the design uses (two — the
   * first citizen a town ever gains) is once in the life of every town that
   * never starves. A town starved back to one and grown again pays a second
   * time, and that is the honest reading of a rule made of comparisons rather
   * than of a stamp on the city (the same discipline `TimedEffect` keeps one
   * system over).
   */
  atPopulation?: number;
  /**
   * The rider fires only when the thing finished was a **wonder** — Dinocrates'
   * ten turns of hammers for raising one.
   *
   * `vsBarbarians`', `capturedWonder`'s and `atPopulation`'s fourth sibling, and
   * a filter on the *occasion* for their reason exactly: a building completed
   * and a wonder completed are one moment asked two ways, and the seam that
   * fires it (`payCompletionRiders`) is the one thing holding the row it has
   * just realised. Read off `WindfallOccasionFacts.wonder`, so a rider written
   * onto an occasion that carries no such fact is simply never on that payout —
   * silent rather than universal, which is what keeps a row written onto the
   * wrong occasion honest.
   */
  wonder?: boolean;
  /**
   * The rider fires only when the great person who acted was of this **family**
   * — The Great Poets' quickened years, which follow an artist and nobody else.
   *
   * `vsBarbarians`', `capturedWonder`'s, `atPopulation`'s and `wonder`'s fifth
   * sibling, and a filter on the *occasion* for their reason exactly: a great
   * person acting and an artist acting are one moment asked two ways, and the
   * seam that fires it (`payActRiders`) is the one thing holding the person.
   * Read off `WindfallOccasionFacts.family`, so a rider written onto an occasion
   * that carries no such fact is simply never on that payout — silent rather
   * than universal.
   */
  family?: Family;
  /**
   * The rider fires only when the building finished or bought was of this
   * **shelf** — Master Masons' culture buildings.
   *
   * The sixth sibling of `vsBarbarians`, and a filter on the *occasion* for
   * their reason exactly: a building completed and a culture building completed
   * are one moment asked two ways. Read off `WindfallOccasionFacts.building`,
   * the row the seam is the only thing still holding — a moment later a Monument
   * is one more entry in a town's `buildings` list — so the shelf is asked of
   * that row rather than carried as a second fact. Never satisfied by an
   * occasion that names no building, which is what keeps a row written onto a
   * kill silent rather than universal.
   */
  buildingCategory?: BuildingCategory;
  /**
   * The rider fires only when the building finished was one of the realm's
   * **single great houses** — Learned Commissions'.
   *
   * `buildingCategory`'s sibling one class over, reading the marker the rows
   * already carry (`BuildingDef.oncePerEmpire`) off the same
   * `WindfallOccasionFacts.building` — the reading `CityScope`'s
   * `hasEmpireBuilding` and `CountKind`'s `empireBuildings` already take, said
   * about the row that was just finished instead of about a town's shelf. A
   * wonder is **not** one of these: the two classes are separate by the marker's
   * own reading, and `wonder` is the filter that names the other.
   */
  empireBuilding?: boolean;
  /**
   * The rider fires only when the occasion was about a **building at all**,
   * whichever one — Civic Receipts' rebate on every roof a town buys (batch C3).
   *
   * `buildingCategory`'s and `empireBuilding`'s sibling with the narrowing taken
   * out: all three read `WindfallOccasionFacts.building`, and this one asks only
   * that the seam carried a row. The filter exists because the purchase occasion
   * fires for a unit as well as for a building and carries no building on the
   * unit's half, so a card that pays "on the purchase of any building" needs to
   * say *building* out loud. Before the C3 rework Civic Receipts got that for
   * free by carrying `empireBuilding: false`, which also excluded the realm's
   * single great houses — a narrowing the rework removed.
   */
  anyBuilding?: true;
  /**
   * The rider fires only when this occasion was a **first of its kind** — Master
   * Masons' guild, Civic Receipts' roof, The Patent Rolls' patent.
   *
   * `vsBarbarians`' discipline read against a ledger instead of against a fact:
   * the seam marks the first (`markFirst`, `state.ts` — the one writer) and
   * hands the ledgers this occasion opened down as
   * `WindfallOccasionFacts.firsts`, so the *world* decides what was first and a
   * card only asks. That split is load-bearing — a record written by whoever
   * happened to hold a card would be a record two empires could each own, and
   * "first" is a contention question (see `FirstKind`).
   *
   * An occasion that opened no ledger never satisfies it, which is the silence
   * every filter on this shape keeps.
   */
  first?: FirstKind;
  /**
   * The rider fires **at most once in a turn** — Field Academies' *"your first
   * combat kill each turn"*.
   *
   * An **absolute stamp and never a counter that resets**, which is this
   * codebase's one discipline about time (`TimedEffect`, `SlottedOrder.
   * sealedUntil`, `City.purchasedUnitTurns`): `PlayerStatecraft.riderTurns`
   * holds the turn this card last rode, the rider is dropped while that turn is
   * the current one, and nothing anywhere ticks it down or sweeps it clean. A
   * turn arriving is the whole of the reset.
   *
   * The stamp is written where the payout is **delivered** (`payWindfallGrants`)
   * rather than where it is composed, because composing is not spending: a seam
   * that builds a payout and finds it empty has cost the card nothing, and a
   * limiter that charged for the asking would silently eat the day.
   *
   * It is per **card**, not per piece: "once per unit per turn" is a different
   * sentence, and Blitz — which says it — is still deferred.
   */
  oncePerTurn?: boolean;
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
   * On this shape rather than on a `rule` clause because it is the same
   * question the other two fields answer — what does this empire's law found a
   * city *with* — and a founding is where all three are read (`foundCityAt`,
   * through `cardFoundingRider`). The road is laid along the path the caravan
   * would have worn, through `Tile.road` and nothing else: one writer, so a
   * highway a doctrine grants and a highway a trader wears are the same mark on
   * the same field.
   */
  roads?: boolean;
  /**
   * Only the first N cities. Absent means all of them.
   *
   * Carried by no live row since the user's card pass of 2026-09-03 took The
   * Founders' Road's free Monument away — read by `cardFoundingRider` exactly as
   * it was, so a card that counts an empire's first towns again is a JSON row.
   */
  maxCities?: number;
}

/** A payout scaled by a count. See `CountKind` and `CardPayout`. */
/** A payout converted from a rate or a meter standing. See `RateSource`. */
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
 * A deepened Order widens an offer by carrying a second rider in its authored
 * increment — one more line of the same kind, folded by `explainOfferSize` like
 * any other — and the cap in `rules.offers.max` is what keeps a deeply drafted
 * card from dealing a spread nobody can see.
 */
export interface CardOfferRiderEffect {
  kind: 'offerRider';
  /** A named rule of what an answered offer does. */
  rule?: OfferRuleId;
  /** Which draft this widens. `'all'` widens every one of them. */
  offer?: OfferRiderScope;
  /** How many extra cards it deals. Absent means one — the ordinary card. */
  extra?: number;
  /**
   * **The draft is dealt from one family alone** — A Court of Merchants' bench
   * of merchants (batch C3).
   *
   * Only a great-person draft has families, so a row carrying this says
   * `offer: 'greatPerson'` and every other reader ignores it. It narrows the
   * **pool** and nothing else, which is the parameter `drawGreatPersonOffer`
   * has taken since The Turning Heavens: the weights, the walk and the rolls
   * stay the ordinary ones, so a narrowed hand is the same machine with a
   * shorter bag.
   *
   * **It is a nudge and never a lock** (`docs/flags.md` item (pppppp)). When the
   * named family has nobody left uncalled, the draw falls back to the whole
   * roster, so the standing rule that a spent roster *banks rather than blocks*
   * survives a card that would otherwise have been able to empty one family and
   * then deal nothing at all.
   *
   * A row that carries this is **not a widening** and is skipped by
   * `explainOfferSize`: narrowing a draft and dealing one more card are two
   * different sentences that happen to live on one shape, exactly as `rule` and
   * `extra` do.
   */
  family?: Family;
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
  /**
   * **Once for every town that admits it** — Harbourmasters' *"+1 trade route in
   * every coastal city with a Harbour"* (the user's orders pass, `docs/flags.md`
   * (xxx) mark 8).
   *
   * The ordinary `CityScope`, and it turns the rider from a fact about the realm
   * into the sea build's own slots-by-count: the fold walks this empire's towns
   * and lines up one entry per admitting town, exactly as `explainRouteSlots`
   * lines up one entry per market. Absent is the realm-wide reading every row
   * written before it meant — the Great Lighthouse grants one route to the
   * empire, not one to each harbour — and the note on Harbourmasters' own row
   * is what stopped saying so.
   */
  scope?: CityScope;
  /**
   * **A road per helping of something counted** — The Harbour Chain's *"+1 route
   * capacity per two Harbours you own, at most +4"*, and The Admiralty's
   * shipyards.
   *
   * `scope` opens a slot **per admitting town** and this opens one per *helping
   * of a count*, and the two are different sentences rather than two spellings
   * of one: Harbourmasters gives every coastal harbour its own road, and The
   * Harbour Chain gives the realm one road for every second harbour anywhere in
   * it. A row carrying both would be asking two questions, so the scope is read
   * first and this is ignored there — `CardRenownEffect`'s precedence, and for
   * its reason.
   *
   * `extra` is what **one helping** opens, which is what makes "+1 per two
   * harbours" the ordinary row and "+2 per two harbours" a row that says so.
   * Answered by `countOf` with the counts' own divisor and ceiling (`helpings`),
   * so a road counted off the harbours and a coin counted off them round the
   * same way. One line, labelled with the helpings, because `explainRouteSlots`
   * is the ledger a player checks when a road they expected is not there.
   */
  count?: CountKind;
  /** How many of `count` buy one helping of `extra`. Default 1. */
  per?: number;
  /** The most helpings that ever open a road — The Harbour Chain's four. */
  max?: number;
  /** Which building `count: 'buildingsOfKind'` counts. The Harbour Chain's harbour. */
  building?: BuildingId;
}

/**
 * **Chairs at the council**, on top of whatever government this empire keeps —
 * The King's Friends, who kept the men who had nowhere else to go.
 *
 * `CardRouteRiderEffect`'s sibling one system over and deliberately its shape: a
 * number of extra somethings, read by one fold, printed as one line. What it
 * says is a fact about the *realm* rather than about a government — "every
 * government opens one more free chair" — which is why it is not a number on a
 * government's own `slots` spread: a row there would have had to be written six
 * times and re-written every time a seventh government is added.
 *
 * **The extra chair is a wildcard**, and that is a ruling rather than a
 * convenience: `slotLayout` groups a government's chairs by flavour, military
 * first, and the index of a chair is a position a player arranges cards in and a
 * card may be paid for (`slotTypesOf`'s contract). A typed chair inserted into
 * the middle of that layout would renumber every position card in the game; one
 * appended at the end takes anything, which is what a free chair means. A row
 * that wants a *typed* chair is a design decision and earns its own field then.
 *
 * Read in exactly one place — `chairCount` (`statecraft/draft.ts`), which every
 * rebuild of `PlayerStatecraft.slots` goes through — and the array's **length**
 * is the standing fact it produces, so a card taken mid-government widens the
 * council the moment it is taken (`refitSlots`) and a card that stopped being
 * held narrows it again on the next refit.
 */
export interface CardSlotRiderEffect {
  kind: 'slotRider';
  /** How many extra chairs. Absent means one. */
  extra?: number;
}

/**
 * A percentage on somebody else's effect. The Grand Bazaar's whole identity.
 *
 * **Two dials, and a row turns one of them.** `percent` is a share of the figure
 * the other table printed; `amount` is a flat step on it, and the pair is
 * `CardMeterRuleEffect`'s `value`/`delta` at this scale — for the reason that
 * shape has both: some numbers a card wants to move are shares ("trade routes
 * pay 50% more") and some are *counts* that a share cannot say exactly
 * ("every luxury you hold counts one fewer toward happiness" — Ea-nāṣir, whose
 * point is a whole point and not a third of one). A row may carry both; the flat
 * step is applied first and the share on what is left, so a card that does both
 * is one arithmetic rather than an argument about order.
 *
 * The flat step is only meaningful where the amplified figure is quoted **per
 * item** — the happiness one luxury pays, and nothing else today. An amplifier
 * on a whole-ledger total (`routeYields`, `founderTrickle`) reads `percent` and
 * ignores `amount`, which is a fact about that target rather than a rule here.
 */
export interface CardEffectAmplifierEffect {
  kind: 'effectAmplifier';
  target: AmplifierTarget;
  /** A share of the other table's figure. Absent is no share at all. */
  percent?: number;
  /** A flat step on it, applied before the share. See the docblock. */
  amount?: number;
  /**
   * **Whose act** — The Great Poets, whose hundred percent is the artists' and
   * nobody else's.
   *
   * A narrowing on the `greatPersonAct` target and meaningless on every other,
   * for `CardWindfallRiderEffect.vsBarbarians`' reason exactly: an act and an
   * artist's act are one moment asked two ways, and a second target
   * (`greatArtistAct`, `greatEngineerAct`, …) would have been five targets for
   * one reading. Read where the amplifier is (`greatPersonActAt`, which holds
   * the person), and a reader with no family in hand — every other target's —
   * **drops** a narrowed row rather than applying it, which is the safe reading
   * for a clause whose whole point is that it reaches one of five.
   *
   * Absent reaches every family, which is what Leonardo's row means and what
   * every row written before this field meant.
   */
  family?: Family;
}

/** A constant of the meters, replaced (`value`) or shifted (`delta`). */
export interface CardMeterRuleEffect {
  kind: 'meterRule';
  rule: MeterRuleId;
  value?: number;
  delta?: number;
  /**
   * **Which towns the rewrite reaches** — `rule: 'cityCost'` only, and required
   * there in spirit if not in the type: a row naming none reprices every town,
   * which is a real sentence and the honest reading of an unnamed argument.
   *
   * The ordinary `CityScope`, read by the ordinary evaluator
   * (`cardCityCostDelta`), so "a town holding an empire building" costs what it
   * costs by the same reading that pays it. Meaningless on the other six rules
   * and **ignored** there rather than refused: those are constants of the realm
   * — what a harbour town costs, how many citizens are free, whether borders
   * freeze — and a scope on a realm's constant is a question with no town to ask
   * it of. `cardMeterRule` therefore never looks at this field, which is what
   * keeps the empire-wide fold exactly as fast and exactly as simple as it was.
   */
  scope?: CityScope;
}

/** A whole clause gated on a fact about the empire. */
export interface CardConditionRuleEffect {
  kind: 'conditionRule';
  when: EmpireCondition;
  then: CardEffect[];
}

/**
 * **A rule this empire's law simply declares true.** One shape for every
 * flag-shaped clause (batch H6).
 *
 * Four kinds stood here before — `actionRule`, `behaviorRule`, `cityRule` and
 * `zocRule` — and all four were *the same evaluation written out four times*:
 * walk the live list for one kind, return true if any effect names this rule.
 * Nothing distinguished them but the id union each drew from, and the four
 * unions are disjoint, so a card naming `freeChop` and a card naming
 * `noHealAbroad` were never two questions — they were one question asked in two
 * dialects, with two describer arms, two bot arms and two readers to keep in
 * step. The four names are **retired**; the rows say `"kind": "rule"` and name
 * the same rule they always named.
 *
 * The **id unions stay four**, and that is the half worth keeping: a seam asks
 * `cardActionRule` or `cardBehaviorRule` and cannot accidentally ask whether the
 * wild is passive when what it meant was whether a chop is free. One shape in
 * the data, four typed doors in the code, one evaluation under all of them
 * (`cardRuleHolds`).
 *
 * No namespace on the id, deliberately: the four unions share no member, so a
 * flat union is unambiguous today and a collision tomorrow is a compile error in
 * `RULE_WORDS` rather than a silent overlap. A prefix would have been a
 * migration of every row for a hazard the type system already refuses.
 */
export interface CardRuleEffect {
  kind: 'rule';
  rule: CardFlagRuleId;
  /**
   * **Which pieces the rule is true of** — Riders of the Steppe's mounted line,
   * which ignores a picket and burns a farm for nothing while the rest of the
   * army does neither.
   *
   * The ordinary `UnitFilter`, asked through `unitMatches` exactly as every
   * other narrowing on this vocabulary is, and **absent means every piece** —
   * which is what every row written before it meant, so Tyranny's free raid is
   * byte-identical without being touched.
   *
   * It is meaningful only where the seam asking has a piece in hand: the two
   * rules that admit one today are `freePillage` (asked in `pillageAt` of the
   * raider) and `ignored` (resolved once per sweep onto `MoveProfile`). A rule
   * about the *empire* — a free chop, a passive wild, a bank that sells
   * libraries — is asked with no piece at all, and a filter on such a row is
   * simply never consulted rather than silently narrowing it to nothing.
   */
  class?: UnitFilter;
  /**
   * **Which building the rule is true of** — Caravanserai Cities' yard, and the
   * only rule in the union that reads it (`buildsEverywhere`).
   *
   * `class`' sibling on the other half of the table, and required in spirit
   * where it is meaningful: a rule that lifted the one-to-a-realm limit on
   * *every* building is a sentence no card says, so `cardBuildsEverywhere` asks
   * for the id and a row that names none matches nothing rather than matching
   * everything. That is the opposite default from `class`, deliberately — a
   * missing unit filter widens a rule that was already about the whole army,
   * and a missing building id would widen a rule that is about one row.
   *
   * Meaningless on every other member and simply never consulted there.
   */
  building?: BuildingId;
}

/**
 * Every rule a `rule` effect may name — the four disjoint sub-unions, joined.
 *
 * `FLAG_RULE_WORDS` in `statecraft/describers.ts` is an exhaustive `Record` over
 * this, so a member added to any of the four and left unworded fails the build.
 * (The table used to be called `RULE_WORDS` and to live in `statecraft.ts`; the
 * name is taken now by `resourceEffects.ts`' table over `ResourceRule`, which is
 * a different union.)
 */
export type CardFlagRuleId = ActionRuleId | BehaviorRuleId | CityRuleId | ZocRuleId;

/** A stat on the empire's *cities* — what they are worth to storm, and how far
 * they see. */
export interface CardCityStatEffect {
  kind: 'cityStat';
  stat: 'defense' | 'sight';
  amount: number;
  scope?: CityScope;
  /**
   * **What buys one helping of `amount`**, taken in the town the line lands in —
   * Siegecraft's *"cities gain +1 combat strength per 4 citizens"* (the user's
   * tree pass of 2026-09-10, `docs/flags.md` (uuu) mark 15). Absent pays the
   * flat once, which is what every row written before this meant.
   *
   * `CardPaysEffect`'s `count`/`per`/`max` trio, said again here rather than
   * borrowed by making a walls line a `pays` row: a city's defence is not one of
   * the six voices, it is not staged by Entry XVII, and it lands in a combat
   * forecast rather than in a ledger. What is shared is the **count** itself —
   * the same `countOf` the yields ask, with the same `within: 'city'` reading —
   * so a card counting citizens for hammers and a card counting them for walls
   * cannot disagree about how many there are.
   *
   * Read in `cardCityStat`, which already holds the town, and folded into the
   * defender's strength as one more labelled line (rule 5 in a fight): the
   * forecast says "Siegecraft · 3 helpings", never a bare number.
   */
  count?: CountKind;
  /** How many of the thing counted buy one helping. Default 1. */
  per?: number;
  /** The most helpings that ever pay. */
  max?: number;
}

/** A rule of Statecraft itself. See `MetaRuleId`. */
export interface CardMetaRuleEffect {
  kind: 'metaRule';
  rule: MetaRuleId;
  value: number;
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
 * A **unit mustered on a cadence** rather than on an occasion — The Standing
 * Levy's spear, raised in the capital every so many turns.
 *
 * `CardPeriodicOfferEffect`'s sibling and deliberately the same shape one
 * currency over: the subject is the calendar itself, so it is read by a turn
 * phase (`musterPeriodicUnits`) rather than asked a question about the board.
 * The cadence is the same **absolute** comparison, `state.turn % every === 0`,
 * for that shape's reason exactly — a countdown is state a phase has to tick,
 * and a phase that ticks it is a phase that can be skipped or run twice.
 *
 * It is not a `windfallRider` because there is no occasion to ride on, and it is
 * not a `foundingRider` because nothing is being founded. The piece arrives
 * through `realiseItem` like every other gifted unit, so the spawn convention
 * has one implementation and the levy goes on no payroll.
 *
 * `'bestMelee'` is `CompletionGrant`'s own word for "the best melee unit you
 * can build" (`buildingData.ts`), read by the same resolver, so a card and a
 * wonder cannot disagree about which spear an empire is owed.
 */
export interface CardPeriodicMusterEffect {
  kind: 'periodicMuster';
  /** Turns between musters. A turn musters when `turn % every === 0`. */
  every: number;
  /** Which piece. `'bestMelee'` asks the roster what this empire can raise. */
  unit: UnitTypeId | 'bestMelee';
  /** Where it appears. The seat of government, and nowhere else today. */
  where: 'capital';
  /**
   * What the levy is **born carrying** — The Levée en Masse's point of movement,
   * kept for the rest of that piece's life.
   *
   * `Unit.stamp`'s ordinary shape (`UnitStamp`), handed to `createUnit` at the
   * birth exactly as `cardUnitStamp`'s is and merged with it there, so a
   * mustered piece raised under The Muster Roll is a veteran twice over and one
   * routine writes the field. It is on **this** effect rather than said with a
   * `unitStamp` clause beside it because a `unitStamp` reaches *every* piece the
   * empire raises, and what the card promises is a mark on the levy it musters
   * — the conscripts, not the whole army.
   *
   * A stamp is a **moment** (see `CardUnitStampEffect`): the piece keeps it when
   * the Doctrine is gone, which is what "for the rest of the game" says and what
   * a bonus read live could not.
   */
  stamp?: UnitStamp;
}

/**
 * **What an empire's law hangs on a piece the moment it wades ashore** —
 * Admiralty's three turns of fighting strength for the men off the boats.
 *
 * The vocabulary's first *moment in a piece's life* that is not its birth, and
 * it is a shape of its own for exactly the reason `unitStamp` is one: a stamp is
 * written at a birth by `createUnit` and a landing is not a birth, so a card
 * that wanted the second could not say it with the first. It is not a
 * `windfallRider` either — a windfall pays an empire and this hangs on one
 * soldier — and not a `unitStat`, which is a *standing* reading of the board and
 * would give the bonus to a column that has been ashore for a decade.
 *
 * **What it hangs is an ordinary `TimedEffect`**, on `Unit.timed`, with an
 * absolute expiry (`state.turn + turns`) and no countdown anywhere: the effects
 * travel untouched and are read by whichever evaluator already reads them, so a
 * strength line hung by a landing joins `planCombat`'s list exactly as a rite's
 * does. That is the whole of why the shape carries a bag of effects rather than
 * a number — the day a card wants three turns of sight off the boats, it is a
 * data row.
 *
 * **Where it is written** is the disembark seam in `advanceAlongPath`
 * (`movement.ts`), and that is the one place it can be: a landing is a fact
 * about a *pair* of hexes (`isShoreStep`, the same reading `stepCost` prices the
 * crossing by), and `arriveOnTile` — the seam for what was standing on the hex —
 * is handed the destination alone. One hang per landing, on the piece that
 * landed, and a **second landing refreshes rather than stacks**: the piece
 * carries exactly one copy of the row, which is what "for three turns" says and
 * the only reading a soldier cannot farm by hopping in and out of the surf.
 */
export interface CardLandfallEffect {
  kind: 'landfall';
  /** How many turns the blessing runs, from the turn the piece came ashore. */
  turns: number;
  /** What is hung on it, read by the ordinary evaluators. */
  effects: CardEffect[];
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
 * A **roster row** a card makes available — Holy Order's Knights Templar (batch
 * B2), and the shape `docs/religion-v2.md` deferred that belief on.
 *
 * `CardUnlocksBuildingEffect`'s twin one table over, and it is a *rule* from the
 * day it was declared rather than a description: `cardUnlocksUnit` is read by
 * `isUnlocked` (`tech.ts`) for a row that declares `UnitDef.unlockedByCard`, so
 * availability stays one question with one answer instead of a card gate beside
 * a tech gate. A row no card names and no node names is shut, which is the
 * clause the Gilded Hall already relies on.
 *
 * It is what an enhancer belief needed and could not say: the founder's law
 * hands over a line of soldiers, and nothing else in the game may raise one.
 */
export interface CardUnlocksUnitEffect {
  kind: 'unlocksUnit';
  unit: UnitTypeId;
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
  /**
   * Which kind of purchase this rides on. Absent means `'unit'`.
   *
   * **`'route'` is the fourth, and `'all'` deliberately does not include it**
   * (batch C7, The Factors' Houses). The other three are rows on a shelf: a unit
   * or a building with a production cost, a bank and a queue. A trade route is
   * none of those — `explainRoutePrice` prices the caravan the road puts on the
   * board and returns, and no bank names it — so the three cards in play that
   * say `'all'` were written about the roster and repricing their owners' routes
   * would be changing live cards by a side effect. A row that means a route says
   * so.
   *
   * `class` is not asked of a route, exactly as it is not asked of a building:
   * the row writes `{}` and the filter is skipped.
   */
  on?: 'unit' | 'building' | 'route' | 'all';
  /** Signed whole percent off the price. `-25` is the Ziggurat's quarter. */
  percent: number;
  /**
   * **Which towns buy at this price** — Mercenary Companies' barracks towns, The
   * Great Patrons' towns that hold a marvel.
   *
   * A price was an **empire** fact until now and nothing else on this shape is
   * about a place, which is exactly what four rows in three decks could not say:
   * "cheaper here" is a reason to build the barracks, and "cheaper everywhere"
   * is a discount with no decision in it. The ordinary `CityScope`, read where
   * the price is folded (`applyRiders`, `purchase.ts`) — which always had the
   * town in hand, since a purchase is made in one — so the counter's line and a
   * yield line mean the same thing by "a town with a Temple".
   *
   * Absent reaches every town, which is what every row written before it meant,
   * so the Great Ziggurat's augurs are byte-identical without being touched. A
   * **bank-less** reading has no town at all (nothing in this game prices a
   * purchase without one), so no caller has to decide what a scoped rider means
   * with nowhere to spend.
   */
  scope?: CityScope;
  /**
   * Narrows a **building** rider to one shelf — The Tithe's religious houses,
   * The Great Patrons' culture houses.
   *
   * `class` says which units and could never say a granary — the very gap `on`
   * was added for — so the building half of this shape had exactly one setting:
   * all of them. This is `CardProductionBonusEffect.buildingCategory`'s field
   * one ledger over and named after it, reading the same one word every row
   * declares (`BuildingDef.category`), so a second culture house is a JSON row
   * rather than an edit here.
   *
   * Asked only of a building being priced: a row carrying it is silent on every
   * unit, whatever `class` says, because "religious spearmen" is not the
   * sentence and a rider that narrowed one half would be narrowing the other by
   * accident. Absent reaches every building, the reading `on: 'building'` has
   * always had.
   */
  buildingCategory?: BuildingCategory;
  /**
   * **Which side of the great-house line the building is on** — Private
   * Patronage's discount on the ordinary shelves and nothing else (batch C4).
   *
   * `buildingCategory`'s sibling, reading the marker the rows already carry
   * (`BuildingDef.oncePerEmpire`) exactly as `CardProductionBonusEffect` and
   * `CardWindfallRiderEffect` read it: `true` narrows to the realm's single
   * great houses, `false` to everything that is not one. It is a boolean rather
   * than a `true` because the card that needed it needed the negative half —
   * "ordinary buildings" is a class this vocabulary can otherwise only name by a
   * `not` it does not have.
   *
   * A **wonder** is not on either side of it and never reaches this field: one
   * is refused in `purchaseError` before a price is asked for at all, so
   * "wonders are unaffected" is true of every purchase rider by construction
   * (and stays true under The Gilded Scaffold, which lifts that refusal in the
   * `if` rather than routing a wonder through a second counter).
   *
   * Asked only of a building being priced, exactly as `buildingCategory` is: a
   * row carrying it is silent on every unit, whatever `class` says. Absent
   * reaches every building, which is what every row written before it meant.
   */
  empireBuilding?: boolean;
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
 *
 * Said as `CardRuleEffect` (`"kind": "rule"`) since batch H6, with the other
 * three flag kinds. The union below is the typed door `cardBorderZoc` knocks on.
 */
export type ZocRuleId =
  | 'borders'
  /**
   * `'ignored'`: the pieces this card names **walk past a picket for nothing** —
   * Riders of the Steppe's, and the horse's whole argument against the phalanx.
   *
   * `'borders'`' opposite number, and the second rule of the zone of control
   * there is: that one *adds* a source, this one excuses a mover from the toll.
   * Resolved once per sweep onto `MoveProfile.ignoresZoc` (`moveProfile`,
   * `pathfind.ts`) for the reason every other empire-wide fact on that struct is
   * — a step's price is asked tens of thousands of times inside one search — and
   * read in `stepCost`, so the highlight, the estimate and the march quote the
   * free ride by construction. The unit sheet's own reading
   * (`inZoneOfControl`) asks the same question, or a rider would be told it was
   * pinned by a line it does not pay.
   *
   * Which pieces is `CardRuleEffect.class`; a row naming none excuses the whole
   * army, which is the filter's own reading everywhere else.
   */
  | 'ignored';

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
 * It is a `renown` shape rather than a town `pays` one because renown is not a
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
   *   · `'buildingOfCategory'` — the buildings of one shelf the realm has
   *     raised, one per city per row (Patrons' culture houses). The shelf is
   *     named in `category`, and the sweep is `CountKind`'s
   *     `buildingsOfCategory` asked through `countOf` — so the renown a patron
   *     pays and the coin a Merchant League pays are counting one thing.
   *
   * All three are multipliers on a fact about the *empire* rather than a line
   * per thing, so one line prints with the arithmetic shown ("… · 3 per culture
   * building × 2") rather than a column a player has to add up.
   */
  per?: 'city' | 'wonder' | 'buildingOfCategory';
  /**
   * Which shelf `per: 'buildingOfCategory'` counts. Ignored by the other two.
   *
   * `CardPaysEffect.category`'s field one shape over, and on the effect
   * for that field's reason exactly: a multiplier that needs an argument names
   * it on the row, so `per` stays a list of questions. Absent counts nothing —
   * the honest answer for a row that never said which shelf.
   */
  category?: BuildingCategory;
  /**
   * **What the empire is counted for** — Patronage's *"+1 renown per 4 citizens
   * in your capital"* (the user's orders pass, `docs/flags.md` (xxx) mark 16).
   *
   * `per`'s wider sibling, and it is a second field rather than three more
   * members on that one because the question is different: `per` names a *thing
   * the trickle is multiplied by* out of a list of three, and this asks the
   * simulation's own counting question (`countOf`, the very reading the yields
   * ask) with a divisor of its own. So a card counting citizens for renown and a
   * card counting them for beakers cannot disagree about how many there are —
   * `CardCityStatEffect.count`'s bargain one ledger over.
   *
   * A row carrying both is a row asking two questions; `per` is read first and
   * this is ignored there, because a multiplier and a count are not composable
   * into a sentence anybody would print.
   */
  count?: CountKind;
  /**
   * How many of `count` buy one helping of `amount`. Default 1.
   *
   * Named apart from `per` because `per` is this shape's older word for *what
   * the trickle is multiplied by* and the two would read as one field with two
   * meanings — which is exactly the confusion `CardPaysEffect`'s three
   * double-duty fields are documented into being safe from, and there is no
   * (`where`, `basis`) pair here to make it disjoint.
   */
  countPer?: number;
  /**
   * **Count it town by town, and cap it town by town** — The Cosmopolitan
   * Court's *"+1 renown per outgoing foreign route, at most three per city"*
   * (batch C5).
   *
   * `CardPaysEffect.within`'s field one shape over and the same word, and it
   * changes three things about a `count` trickle at once, which is why it is one
   * field and not three: the count is asked of each town rather than of the
   * realm, `max` becomes the ceiling **per town** rather than over the whole
   * sum, and `scope` — which means nothing on a bare count — starts naming which
   * towns are walked.
   *
   * A card wanting a per-town cap could not be written any other way. An empire
   * count with a ceiling caps the realm's total, and a staircase of three
   * `per: 'city'` rows at three thresholds adds up to the same figure while
   * printing three near-identical sentences at the player, which is the near-fit
   * the deck's house rule refuses. The trickle is still an **empire** fact: it
   * accrues on the player and joins `explainRenown`'s one list, exactly as
   * `scope` says of the `per: 'city'` arm.
   *
   * Meaningless with `per` (that field is read first and wins) and ignored
   * there.
   */
  within?: 'city';
  /**
   * Which hexes a `count: 'tilesInBorders'` trickle counts — The Customs
   * Houses' works (batch C2).
   *
   * `CardPaysEffect.tile`'s field one ledger over, and here for `count`'s own
   * reason: the renown probe hands the count its arguments, and a count that
   * takes one has to be able to carry it. Ignored by every other count.
   */
  tile?: TileCondition;
  /**
   * The most helpings that ever pay. `count` only — and **per town** where the
   * row also says `within: 'city'`, which is the whole reason that field exists.
   */
  max?: number;
  /** Which family this feeds. Absent feeds the pool and no family. */
  family?: Family;
  /**
   * **Which towns are counted**, on a `per: 'city'` trickle — The Provincial
   * Stages' towns outside the capital that keep several culture houses, The
   * Laureate's towns whose citizens work a master's ground.
   *
   * `CardAuthorityEffect.scope`'s field one ledger over and read the same way:
   * the ordinary `CityScope`, asked by the ordinary evaluator, so "a town
   * holding a marvel" means here exactly what it means on a yield line. Renown
   * is still an **empire** fact and this changes nothing about that — the
   * trickle accrues on the player and joins `explainRenown`'s one list, as it
   * always has. What the scope narrows is the *count*: it is the difference
   * between "one renown in every town" and "one renown for each of the towns
   * that earned it", which is the sentence seven Magisterial rows are written in
   * and none of them could say.
   *
   * Meaningless on `'wonder'` and `'buildingOfCategory'` and ignored there:
   * those count *things*, and a scope is a predicate over a town. A bare
   * `count` ignores it too, for the same reason — unless the row says
   * `within: 'city'`, which turns the count into a walk over towns and so gives
   * the scope something to narrow. Absent counts every town,
   * which is what every row written before it meant, so the Council of Elders is
   * byte-identical without being touched.
   */
  scope?: CityScope;
}

/**
 * A number of the **tide** that a card rewrites. See `rules.religion`.
 *
 * `MeterRuleId`'s pattern one system over, and it is here for that type's
 * reason: the enhancer pool is entirely about how belief travels, and a
 * vocabulary that could not name a range would have needed six one-off clauses
 * in `explainPressure`. Every member is a key of `rules.religion` and every one
 * of them is read in exactly one place — the pressure fold — so a designer who
 * adds a source adds a member here and an arm there and nothing else.
 *
 * `routeBothWays` is the one that is a switch wearing a number's clothes: any
 * delta above zero turns it on, which is how a boolean joins a shape whose whole
 * point is that it is arithmetic.
 */
export type PressureRuleId =
  | 'siteRange'
  | 'siteStrength'
  | 'cityRange'
  | 'cityStrength'
  | 'roadStrength'
  | 'routeStrength'
  | 'capitalStrength'
  /**
   * **How far the seat of the faith carries** — Pilgrims' (the user's orders
   * pass, `docs/flags.md` (xxx) mark 18).
   *
   * `capitalStrength`'s missing twin. Every other source in the tide is a pair —
   * a strength and a reach — and the founder's capital had only the first: it
   * held *itself* and drifted nowhere, which is `explainPressure`'s "a founder's
   * capital does not drift". So `rules.religion.capitalRange` is **0** in every
   * game nothing says otherwise, meaning the capital's own hex and nothing
   * further, and the fold is byte-identical to the day before this existed.
   * A card that shifts it gives the seat a reach, which is the whole of what
   * Pilgrims is.
   */
  | 'capitalRange'
  | 'templeOwnPercent'
  | 'templeForeignPercent'
  | 'bombRange'
  | 'bombLump'
  | 'routeBothWays';

/** A signed shift on one number of the tide. See `PressureRuleId`. */
export interface CardPressureRuleEffect {
  kind: 'pressureRule';
  rule: PressureRuleId;
  delta: number;
}

/**
 * A standing source of religious pressure — Hagia Sophia's.
 *
 * The wonders' half of the tide, and deliberately the *simplest* shape in the
 * union: a number of faith projected `range` hexes from the city the stones
 * stand in, for the religion that city's owner founded. Read only in
 * `explainPressure`, which is the whole of the claim that a wonder that presses
 * is a JSON row.
 *
 * It follows the stones like every other wonder clause: a captured Hagia Sophia
 * presses for its captor's faith the turn the town changes hands.
 */
export interface CardPressureEffect {
  kind: 'pressure';
  amount: number;
  range: number;
  /**
   * **What the town is counted for** — the High Temple's *"presses its faith
   * harder for every 4 citizens it holds"* (the user's orders pass,
   * `docs/flags.md` (xxx) mark 17, where the ability came off a card and onto
   * the stones).
   *
   * `CardCityStatEffect.count`'s trio said a third time, and here for that
   * shape's reason exactly: what a wall is worth per citizen and what a shrine
   * presses per citizen are the same *counting* question, and a second
   * implementation of "how many people live here" beside `countOf` is how two
   * rows start disagreeing about one number. Asked with `within: 'city'` of the
   * town the stones stand in — `cardPressureSources` is the one fold that has
   * kept the town, which is why this is expressible here and nowhere else.
   *
   * Absent pays the flat once, which is what every row written before it meant.
   */
  count?: CountKind;
  /** How many of the thing counted buy one helping of `amount`. Default 1. */
  per?: number;
  /** The most helpings that ever press. */
  max?: number;
}

/**
 * Gold off what **one piece** costs its empire every turn — The Quartermasters'
 * shilling, The War Chest's three, The Wintering Grounds' whole payroll.
 *
 * `CardRule`'s `unitUpkeep` and this shape are two dials on one ledger and
 * neither is the other, which is why both exist. That rule is a **percentage on
 * the payroll total** — Tyranny takes thirty percent off the army, whatever the
 * army is — and this is a **flat figure per soldier**, which is the only way to
 * say "a knight costs one less" without saying a different thing about a
 * warrior. `CardEffectAmplifierEffect`'s `percent`/`amount` pair, one ledger
 * over, and split across two shapes rather than fused because the two land in
 * different arithmetic: a share of a total, and a walk of the pieces.
 *
 * It joins `explainUnitUpkeepRebate` (`upkeep.ts`) as **its own labelled line**
 * beside the percentage's, which keeps both halves of that function's bargain:
 * rule 5 says the ledger shows what the army costs and then what the law gives
 * back, and `disbandCandidate` goes on picking off the *gross* figures so the
 * creditors' choice is the same under every government. The whole rebate is
 * clamped to the payroll — a card that pays more than the army costs pays the
 * army off and stops, because a treasury that earned coin by keeping soldiers
 * would be a mint.
 *
 * `class` is the ordinary `UnitFilter`, so a row says "military units" by asking
 * the roster; `where` is asked of the hex the piece is standing on, exactly as
 * `CardUnitStatEffect.where` is, because "no upkeep outside your borders" is a
 * fact about where the army *is* and a payroll is settled once a turn wherever
 * it happens to be standing.
 */
/**
 * Gold **added to** what one piece costs its empire every turn — The Reckless
 * Levy's coin a soldier (*"every unit costs one more coin to keep"*, the user's
 * ruling of 2026-09-06).
 *
 * `CardUpkeepRebateEffect`'s twin, field for field and clause for clause, and a
 * shape of its own rather than that one with a negative `amount`: a give-back is
 * clamped (a card cannot turn a payroll into a mint) and a charge is not (an
 * empire that cannot pay goes into arrears, which the game already answers), so
 * the two read the same and behave differently, and a row saying "−1 rebate"
 * would be a row nobody could read out loud. The house rule is the deck's: a
 * card whose text needs a shape defers or gets the shape, never a near-fit.
 *
 * It is deliberately **not** `CardRule`'s `unitUpkeep` either. That rule is a
 * percentage of the payroll total and its one field is called `percent`; a coin
 * a soldier put in it would be a number the describer prints as a percentage and
 * a designer reads as one. A share of a total and a walk of the pieces are two
 * arithmetics, which is exactly the argument the rebate's docblock makes above.
 *
 * Charged only on pieces the empire is **already paying for** (`costOf` > 0), so
 * the three exemptions stand: a levy makes an army dearer, it does not start
 * taxing settlers. It joins `explainEmpireGold`'s unit-maintenance line as its
 * own labelled charge through `explainUnitUpkeepSurcharge` (`upkeep.ts`) — the
 * same one fold the rebate's give-back lands in, never a second one.
 */
export interface CardUpkeepSurchargeEffect {
  kind: 'upkeepSurcharge';
  /** Gold added to each matching piece's own figure. */
  amount: number;
  /** Which pieces. Absent reaches every one this empire pays for. */
  class?: UnitFilter;
  /** Where the piece must be standing. Absent means anywhere. */
  where?: 'ownTerritory' | 'foreignTerritory';
}

export interface CardUpkeepRebateEffect {
  kind: 'upkeepRebate';
  /** Gold off each matching piece's own figure. Ignored when `free` is set. */
  amount?: number;
  /** The matching piece costs nothing at all — The Wintering Grounds'. */
  free?: boolean;
  /** Which pieces. Absent reaches every one this empire pays for. */
  class?: UnitFilter;
  /**
   * Where the piece must be standing. Absent means anywhere.
   *
   *   · `'ownTerritory'` / `'foreignTerritory'` — the border, read the way
   *     `CardUnitStatEffect.where` reads it: a hex nobody owns is abroad.
   *   · `'garrison'` — **standing in one of your own towns**, which is a
   *     narrower thing than standing on your own ground and is exactly what
   *     Taizong's Fubing says (`docs/leaders.md`: "costs no upkeep while
   *     garrisoned"). A named value rather than a `CityScope`, for
   *     `foreignTerritory`'s reason: a scope is a question about a *town's*
   *     ledger and this is a question about a hex a soldier is standing on.
   *     The soldier-farmers of the fubing system fed themselves in the
   *     garrison town and cost the treasury nothing there; in the field they
   *     were an army like any other.
   */
  where?: 'ownTerritory' | 'foreignTerritory' | 'garrison';
}

/**
 * **What your other Orders pay, paid again** — the engine shape of
 * `docs/history/fewer-things.md` §4, ruled: *"your Orders that give food give an
 * additional food"*.
 *
 * The first clause in the vocabulary whose subject is the **deck**. Every other
 * reader of the cards counts them (`slottedOrdersOfSlot`) or counts what they
 * are worth once (`effectAmplifier`'s targets are other systems' figures); this
 * one reads the card fold itself — `explainCardCityYields`, `explainCardEmpireYields` and the
 * lines the cards put on the ground — and adds to every line of one voice.
 *
 * Additive is the default, and that is the user's ruling rather than a taste
 * -----------------------------------------------------------------------
 * *"Amplifiers stack additively, not multiplicatively … (per line instance, so
 * it stacks with '+1 food on each resource hex' hex by hex)"*
 * (`docs/history/orders-pass-3.md` §9). `amount` is therefore paid **once per line
 * instance** — per town for a per-town line, per hex for a hex line, once for an
 * empire line — which is what makes the engine worth more in a wide realm and
 * worth more beside a card that already dresses forty hexes. A share (`percent`)
 * is the late, rare variant and survives on one card ("half again"); a row may
 * carry both, and the flat is added before the share is taken of what the other
 * card printed, which is `CardEffectAmplifierEffect`'s own order one table over.
 *
 * What it reaches, and what it deliberately does not
 * --------------------------------------------------
 *   · **the Orders' lines only** — the ruled sentence says *your Orders*, and a
 *     government's signature, a wonder's clause and a technology's gift are not
 *     things a player arranged in a chair. Read off the line's own `card`;
 *   · **never its own card**, so an amplifier cannot amplify itself and two of
 *     them cannot amplify each other into a spiral. Every amplifier reads the
 *     fold *as it stood before any amplifier spoke*, so their order cannot change
 *     what either pays — `cardYieldConversions`' rule, one list over;
 *   · **the ground only when the row names no `scope`**. A scope is a question
 *     about a *town* and the empire's tile pass has none in hand; a scoped
 *     amplifier is a fact about one town's ledger and stays out of the hexes.
 *     (`scopedCardTileLines`' own lines are likewise left alone: they already
 *     name which town they landed in, and a second scope on one fold would be two
 *     answers to one question.)
 *
 * `scope: { test: 'capital' }` is the ruled capital engine — *"yields to your
 * capital from Orders are 50% more effective"* — and needs nothing of its own:
 * the seat of government is an ordinary `CityScope`, so the row says where and
 * the one evaluator answers.
 */
export interface CardYieldAmplifierEffect {
  kind: 'cardYieldAmplifier';
  /** The voice amplified. `'all'` reaches every one of the six. */
  yield: CityYieldKey | 'all';
  /** Paid once per amplified **line instance**. The default shape. */
  amount?: number;
  /** A share of what the amplified line prints. The late, rare variant. */
  percent?: number;
  /** Which towns the amplified line must land in. Absent means everywhere. */
  scope?: CityScope;
}

/**
 * **A share on what a class of buildings pays**, its per-citizen lines included
 * — The Synod's *"your faith buildings +50%"*, The Counting Houses' gold, and
 * the doublers the balance turn asked for.
 *
 * `CardPercentYieldsEffect` is a percentage on a **town's** voice and joins Entry
 * XVII's staged multiplication; this is a percentage on a **building's own
 * lines** and is therefore a *flat* addition to the town, folded beside
 * `explainCityBuildings` and staged afterwards exactly as the building's own
 * figure is. The two are different questions and neither is the other: "+10%
 * science in this city" reaches the tiles, the caravans and the cards, and
 * "science buildings pay half again" reaches four shelves.
 *
 * Which buildings, and the voice selector
 * ---------------------------------------
 * `category` is `BuildingDef.category`, the one word every row declares. It is
 * *not* the same question as "a faith building" in a card's own sentence — the
 * table's seven categories are what a building is **for**, and a Shrine
 * categorised `faith` and a Cathedral categorised `culture` both pay faith. So
 * `pays` is the second selector and it is the honest reading of the ruled text:
 * **a faith building is a building whose row pays faith** (`CityScope`'s
 * `hasBuildingYielding` asks the same question of a town, and answers it the same
 * way). A row may name one, the other, or both; naming neither reaches every
 * building the town has raised.
 *
 * `yield` is which of the *building's* voices is raised — absent means all of
 * them, which is what a doubler means.
 *
 * `appliedLast`, and the only thing here that could be got wrong
 * -------------------------------------------------------------
 * The user's ruling: a doubler *"applies to total yields, including from other
 * effects"*. So the arithmetic is two stages and never one:
 *
 *     raised  = base + floor(base × Σ ordinary% ÷ 100)
 *     paid    = raised + floor(raised × Σ appliedLast% ÷ 100)
 *
 * summed within each stage before one multiplication (Entry XVII's rule, read
 * one ledger down), floored per building and per voice so two half-points buy
 * two halves rather than rounding into a free one. A doubler is therefore
 * `percent: 100, appliedLast: true`, and it doubles what the Vestry already
 * raised rather than racing it.
 */
export interface CardBuildingYieldPercentEffect {
  kind: 'buildingYieldPercent';
  /** The share, in whole percent. */
  percent: number;
  /** Which buildings, by what the row is *for*. Absent means any. */
  category?: BuildingCategory;
  /** Which buildings, by the voice the row **pays**. Absent means any. */
  pays?: CityYieldKey;
  /**
   * **One named row, and nothing else** — Rūmī's *"double the yields of
   * temples"* (the great-person pass, batch GP2).
   *
   * `UnitFilter.type`'s bargain one table over, and the last resort for the same
   * reason: `category` and `pays` ask what a building *is*, so a clause written
   * against either keeps meaning what it said when the table grows, and this one
   * does not. It exists because a ratified text sometimes names one house — a
   * scholar who taught in the temples means the temples — and the honest way to
   * say that is the row's own id rather than a category that would quietly
   * collect the cathedral beside it.
   *
   * Folded with the others: a row naming a building *and* a category reaches
   * only what satisfies both, which is the selector's own rule and not a
   * special case.
   */
  building?: BuildingId;
  /**
   * **Only the marvels** — Dürer's *"+50% yields from wonders"*.
   *
   * `CountKind`'s `wonders` asked of one building instead of of a realm, off the
   * same declaration (`BuildingDef.wonder`, read by `isWonder`), so nothing here
   * compares an id against a name. A class the data already declares, which is
   * why it is a flag beside the two selectors rather than an eighth
   * `BuildingCategory`: a wonder's category says what it *pays*, and the Oracle
   * and the Colossus belong to different shelves and to one class.
   *
   * `true` narrows to wonders; **absent reaches everything**, wonders included,
   * which is the reading a doubler naming no class has always had. There is no
   * `false` half — a card that meant "your ordinary buildings and not the
   * marvels" has never been written, and a negation the table does not ask for
   * would be dead vocabulary.
   */
  wonder?: true;
  /** Which of the building's voices is raised. Absent means every one. */
  yield?: CityYieldKey | 'all';
  /** Taken over the building's total **including** the ordinary shares. */
  appliedLast?: boolean;
  /** Which towns it lands in. Absent means every one. */
  scope?: CityScope;
}

/**
 * **The Order in one chair, paid again** — *"your first economic slot pays
 * twice"*, the most Balatro of the five engine shapes.
 *
 * It is `cardYieldAmplifier` narrowed from a voice to a **chair**: instead of
 * "every line of food", the subject is every line of whichever Order is sitting
 * in one named position, in every voice at once. So the two shapes are one pass
 * over one list and neither is a special case of the other's arithmetic.
 *
 * The position is a fact because the slots are ordered
 * ----------------------------------------------------
 * `PlayerStatecraft.slots` is an array indexed by the government's `slotLayout`
 * and **the index is the drawn order** — the contract stated on that field and on
 * `slotTypesOf`. So "the first economic slot" is the lowest-indexed slot whose
 * *layout flavour* is economic, whatever card happens to be in it (a wildcard
 * chair holding an economic card is not an economic chair — the player is being
 * paid for where they put it, which is the decision the card is about).
 *
 * `slot` absent means "any chair", so `position: 1` with no flavour is the very
 * first chair on the screen. `factor` is what the line is multiplied by — 2 pays
 * twice — and the extra is added as its own labelled line, never by rewriting the
 * card's own (rule 5: the sheet says where the second helping came from).
 */
export interface CardSlotPositionEffect {
  kind: 'slotPosition';
  /** Which flavour of chair is counted. Absent counts every chair. */
  slot?: SlotType;
  /** Which chair of that flavour, counting from one, in slot order. */
  position: number;
  /** What that Order's lines are multiplied by. 2 pays twice. */
  factor: number;
}

/**
 * **Every so many turns, a boon** — the periodic occasion of
 * `docs/history/fewer-things.md` §4, ruled worthwhile because *frequency × size* is a
 * second axis of scaling beside the flats.
 *
 * Nothing ticks, and that is the whole of the discipline
 * -----------------------------------------------------
 * The next firing is an **absolute turn stamp** on the slot record
 * (`SlottedOrder.nextFiresTurn`), compared and never counted down —
 * `TimedEffect`'s rule at a different cadence. The phase
 * (`runPeriodicBoons`) fires when `state.turn >= nextFiresTurn` and re-stamps
 * `state.turn + period`; a slot with no stamp yet is stamped on the first phase
 * after the card is placed. A card taken out of its chair loses its clock with
 * the chair, which is the standing ruling ("the bench is never productive") read
 * literally.
 *
 * The **period** is `max(2, everyTurns − Σ periodShorten)` — the floor of two is
 * on the period and never on the stamp, so a stack of shorteners cannot buy a
 * boon every turn. See `CardPeriodShortenEffect` for what happens to a stamp
 * already made when the clock changes.
 *
 * The boon **is a windfall** (`WindfallOccasion`'s `periodic`): its figure is
 * composed once with every rider before anything is banked, so it is
 * modifier-immune like every other grant and a card that says "your boons pay
 * more" is an ordinary rider rather than a second rule.
 *
 * The figure is a flat, or a count
 * --------------------------------
 * `amount` alone is the flat. With `count`, the figure is that count's answer
 * times `amount` (one by default), and the count's arguments ride on this row
 * exactly as they ride on `pays` count — so "faith equal to your empire's
 * science" is `count: 'empireYield', voice: 'science'` and The Long Count's
 * "renown equal to your science and faith buildings" is
 * `count: 'buildingsOfCategories', categories: ['science', 'faith']`. One
 * evaluator answers both, because it is the same `countOf`.
 */
export interface CardPeriodicEffect {
  kind: 'periodic';
  /** Turns between firings, before any shortener. The period floors at two. */
  everyTurns: number;
  /** Which bank the boon lands in. `'renown'` feeds the great-person pool. */
  pays: CityYieldKey | 'renown';
  /** The flat figure, or what one helping of `count` pays. Default one. */
  amount?: number;
  /** …or the figure is this count's answer. See `CountKind`. */
  count?: CountKind;
  /** How many counted things buy one helping. Default one. */
  per?: number;
  /** The most helpings that ever pay. */
  max?: number;
  /** The count's arguments, `CardPaysEffect`'s fields exactly. */
  building?: BuildingId;
  category?: BuildingCategory;
  categories?: BuildingCategory[];
  slot?: SlotType;
  voice?: CityYieldKey;
  class?: UnitFilter;
  tally?: TallyOccasion;
}

/**
 * **Your every-N-turn cards come round sooner** — the shortener of
 * `docs/history/fewer-things.md` §4 (The Almanac of Hours, The Great Clock, Horology's
 * Water Clock), and the reason "every 5, shortened by 2" is a different card
 * from "every 10".
 *
 * It reaches **every** periodic Order this empire holds, sums with every other
 * shortener before one subtraction, and the period floors at **two turns** so a
 * stack cannot buy a boon every turn.
 *
 * What happens to a stamp already made
 * ------------------------------------
 * The rule, stated once and pinned in `test/sim/statecraft.test.ts`: **a change
 * of clock moves every outstanding stamp by the change in period**, and by
 * nothing else —
 *
 *     nextFiresTurn += newPeriod − oldPeriod
 *
 * so a boon three turns from firing is two turns from firing the instant a
 * shortener of one is slotted, and three again if it is taken out. It is exact,
 * symmetric and reversible, which is what keeps slotting and unslotting a
 * shortener from being a way to farm a boon or a way to lose one. The stamp may
 * land on a turn already past, which simply means the boon is due at the next
 * end of turn — the phase compares, it does not count.
 *
 * The change is noticed by the phase itself (`SlottedOrder.firePeriod` records
 * the clock the stamp was made under), so slotting a shortener needs no hook in
 * the reducer: the only moment anything fires is the only moment anything has to
 * be re-stamped.
 */
export interface CardPeriodShortenEffect {
  kind: 'periodShorten';
  /** Turns off every periodic Order's clock. Shorteners sum; the floor is two. */
  turns: number;
}

/**
 * **A share on what one town earns in renown** — the Heroic Epic's *"this city
 * gains +50% renown"* (`docs/history/tech-gifts.md` §7).
 *
 * Renown is a flat per building today (`BuildingDef.renown`), so this is the
 * first percentage the ladder has ever had, and it is city-scoped by
 * construction: a unique building is *a decision about where*, and a percentage
 * that reached the realm would have made the decision for the player.
 *
 * Read in `explainCityRenown` (`renown.ts`) as one more labelled line of the list
 * the total is the fold of — never as a multiplication afterwards. It is taken
 * over **that town's buildings' own trickle** and nothing else: a specialist's
 * point is added beside the call rather than inside it (that function's own
 * split, and for its reason — the guild bar is filled by the buildings' figure
 * and a percentage feeding the bar that made it would be a loop with no brake),
 * and a Triumph's lump is not a town's at all.
 *
 * The line **names no family**, `resourceRenown`'s construction exactly: the pool
 * grows and the feed record that weights the draw does not, so a percentage
 * cannot quietly bias which great person arrives.
 */
export interface CardCityRenownPercentEffect {
  kind: 'cityRenownPercent';
  /** The share, in whole percent. Floored once, per town. */
  percent: number;
  /** Which towns it lands in. Absent means every one. */
  scope?: CityScope;
  /**
   * **Which reading of "renown" the share is taken of** — the town's buildings
   * (absent, the Heroic Epic's) or the whole recurring trickle (`'empire'`, Cult
   * of Heroes' *"+15% renown"*, batch B2).
   *
   * A field rather than a second kind, because it is the same sentence asked at
   * two scales and the words differ by one clause. The two are read in two
   * places and never in both: `cardCityRenownShares` hands the town-scoped ones
   * to `explainCityRenown`, and `cardEmpireRenownShares` hands this one to
   * `explainRenown`, which takes it over the fold of every recurring line above
   * it — the buildings, the specialists, the cards and the luxuries — and never
   * over another share, because two shares on one empire must buy two shares
   * rather than compounding.
   *
   * A Triumph's lump is deliberately outside it: that renown was banked the
   * instant it was earned, and a percentage of history is not a trickle. The
   * line names **no family**, the town-scoped arm's construction exactly.
   *
   * An empire-scoped share takes no `scope`: there is no town for one to be
   * asked about, and a scoped one would be a city reading wearing this field's
   * name.
   */
  where?: 'city' | 'empire';
}

/**
 * One voice of a route raised by a share. See `CardPaysEffect.share`.
 *
 * `CardYieldAmplifierEffect`'s pair of fields exactly (a voice and a percent),
 * because it is the same sentence one ledger over — and `'all'` means every
 * voice a caravan pays, which is the five of them: faith is not among them, for
 * `RouteYieldLine`'s reason (nothing pays a caravan in it).
 */
export interface CardRouteShare {
  yield: CityYieldKey | 'all';
  percent: number;
}

/**
 * A deed the **last age** counts, for the four Æra V bead Orders.
 *
 * A union of its own rather than a widening of `BeadOccasion`, and the reason is
 * that the two lists answer different questions. `BeadOccasion` is *what the
 * world announces* — thirteen firsts a deck may race for, each hooked once — and
 * every one of them is already announced whether or not anybody is looking. These
 * four are things the game does not announce at all, because until now nothing
 * paid for them: a draft turned down, a town burnt, a proclamation read, and a
 * node of the last age. Each is hooked at its own single seam and each is asked
 * of one empire.
 *
 * They are named for the deed and never for the card, so a second row wanting
 * "each time you raze a city" is a JSON row rather than a fifth occasion.
 * `docs/audit/orchestrator.md` H3; reconciling the four occasion unions is H6's.
 */
export type OrderBeadOccasion =
  /** A technology of the last age of the chart was finished. `settleResearch`. */
  | 'lastAgeTechnology'
  /** A whole Order draft was turned down. `settleOrderSkip`. */
  | 'draftPassed'
  /** A city this empire held was pulled down. `razeCityAt`. */
  | 'cityRazed'
  /** A prophet spoke. `proclaimAt`. */
  | 'proclamationMade';

/** Every occasion in the union, for the register test and the seams. */
export const ORDER_BEAD_OCCASIONS: readonly OrderBeadOccasion[] = [
  'lastAgeTechnology',
  'draftPassed',
  'cityRazed',
  'proclamationMade',
];

/**
 * **A glass bead of your own, on a deed you choose to do** — the shape the four
 * Æra V bead Orders were written for and waited on (`docs/audit/dead-code.md`
 * §1.5: four rows, one shape).
 *
 * It is a *rider on an occasion*, which is what keeps it out of the bead
 * machinery's way: the row names a **grant** bead (`data/beads.json`) and the
 * occasion that mints it, `statecraft.ts` answers which rows a live card mints,
 * and `awardBead` is still the one and only writer of `Player.beads`. So the
 * bead is announced, registered, diffed onto the rod and shown on the Abacus by
 * exactly the machinery every other bead in the game uses, and the card added
 * nothing beside it. The bead row carries `repeatable`, which is what lets one
 * empire mint it more than once — see `BeadGrantDef.repeatable`.
 *
 * `every` is a **rhythm**, not a cap: The Great Enquiry pays on every second
 * node of the last age, and the count it is measured against is the empire's own
 * running total of that occasion, which only a seam that already keeps one can
 * supply. An effect asking for a rhythm at a seam that counts nothing mints
 * nothing rather than paying every time — the honest refusal, because the
 * alternative is a card quietly paying twice what its own words promise.
 *
 * **Who may hold it is the deal's rule and not this one.** `OrderDef.fromAge`
 * keeps these four rows out of every bag before the last age (`drawablePool`,
 * the ruling of 2026-09-06 item (l)), so "earned only there" is true of a card
 * nobody can be holding earlier, and a second age gate here would be the same
 * rule written twice.
 */
/**
 * **A verb the tree teaches, held without the node that teaches it** — The
 * Muses' Call's *"great people may be called before the technology that opens
 * them"*.
 *
 * An `AbilityId` is the one register for *"may this empire do that"*
 * (`techData.ts`): embarkation, the siege, the five rites, and the door the
 * great-person offer opens behind. Until B1 every one of them was a fact about
 * the *tree* alone — `techsGrant` walked the researched list and that was the
 * whole answer — and a card that wanted to open one of those doors had nothing
 * to say.
 *
 * **Why a card may open a door a technology opens.** The ability union is
 * deliberately a list of *verbs* rather than a list of nodes: it exists so that
 * a rule can ask "may this empire call a great person" without knowing which
 * node happens to teach it today, which is exactly what let the tree pass move
 * the gate with one line of `data/techs.json`. A Doctrine that says the same
 * sentence is asking the same question, so the honest place for it is the same
 * door — not a second flag on the player, and not a clause bolted to the one
 * seam that reads it. What changes is only *who may answer*: the tree, or the
 * empire's own law.
 *
 * **`hasAbility` (`tech.ts`) is the only reader**, and that is the whole of the
 * discipline. It was already the sibling every surface but the movement
 * evaluator asked; it is now `techsGrant` **or** this shape, in one function, so
 * a rule that gates on a verb cannot come to disagree with the card that grants
 * it. A second reader here would be a second answer to "may this empire do
 * that", which is the drift the ability register exists to prevent.
 */
export interface CardGrantsAbilityEffect {
  kind: 'grantsAbility';
  ability: AbilityId;
}

export interface CardBeadOccasionEffect {
  kind: 'beadPerOccasion';
  occasion: OrderBeadOccasion;
  /** Which bead row is minted. A grant row, and a repeatable one. */
  bead: BeadGrantId;
  /** Mint on every nth occasion instead of on each. Absent is every one. */
  every?: number;
}

/** Everything a card may say. One union, one evaluator (`statecraft.ts`). */
export type CardEffect =
  // Batch E5: town `pays`, hex `pays`, empire `pays`, route `pays`,
  // `pays` mirror, `pays` count, `pays` share and `pays` rate were
  // eight names for one idea — *pay a voice* — and are retired into this one.
  // See `CardPaysEffect`, and `docs/audit/e5-yield-shape.md` for the table.
  | CardPaysEffect
  | CardPercentYieldsEffect
  | CardProductionBonusEffect
  | CardRulePercentEffect
  | CardHappinessEffect
  | CardAuthorityEffect
  | CardHappinessTierBoostEffect
  | CardCombatLineEffect
  | CardUnitStatEffect
  | CardUnitStampEffect
  | CardWindfallRiderEffect
  | CardFoundingRiderEffect
  | CardOfferRiderEffect
  | CardRouteRiderEffect
  // Batch L3a: the route rider's sibling, and the one shape that widens a
  // council. See `CardSlotRiderEffect`.
  | CardSlotRiderEffect
  | CardEffectAmplifierEffect
  | CardMeterRuleEffect
  | CardConditionRuleEffect
  | CardCityStatEffect
  | CardMetaRuleEffect
  // Batch H6: `actionRule`, `behaviorRule`, `cityRule` and `zocRule` were four
  // names for one evaluation and are retired into this one. See `CardRuleEffect`.
  | CardRuleEffect
  | CardPeriodicOfferEffect
  | CardPeriodicMusterEffect
  // E4b's one new shape: a moment in a piece's life that is not its birth.
  | CardLandfallEffect
  | CardUnlocksBuildingEffect
  | CardUnlocksUnitEffect
  | CardPantheonSlotsEffect
  | CardPurchaseRiderEffect
  | CardProjectRiderEffect
  | CardRenownEffect
  | CardPressureRuleEffect
  | CardPressureEffect
  | CardUpkeepRebateEffect
  | CardUpkeepSurchargeEffect
  // The engine shapes of `docs/history/fewer-things.md` §4 and `docs/history/tech-gifts.md` §7,
  // built as batch A of `docs/fewer-things-plan.md` ahead of the rows that
  // would use them. Batches D through F wrote those rows, and all seven shapes
  // are now live in the table — so the fixtures in `test/sim/statecraft.test.ts`
  // that proved them before any row existed are a second reading rather than
  // the only one.
  | CardYieldAmplifierEffect
  | CardBuildingYieldPercentEffect
  | CardSlotPositionEffect
  | CardPeriodicEffect
  | CardPeriodShortenEffect
  | CardCityRenownPercentEffect
  // H3's one new shape (`docs/audit/orchestrator.md`): the four Æra V bead
  // Orders had `effects: []` and were being dealt paying nothing.
  | CardBeadOccasionEffect
  // B1's one new shape: The Muses' Call opens a door the tree opens.
  | CardGrantsAbilityEffect;

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
  /** Named halves that are deliberately absent. See `docs/deprecated/statecraft-cards.md`. */
  deferred?: string[];
  effects: CardEffect[];
}

/** How many slots of each type a government opens. */
export type SlotSpread = Record<SlotType, number>;

export interface GovernmentDef extends CardDefBase {
  /** The culture tier at which this government is offered. 0 is the start. */
  tier: number;
  /**
   * **How many chairs this government supplies** — the whole of what a
   * government says about seating since the decks rework (D1a: *"chairs are
   * universal"*). The number is its tier's rung on `tierLadder` (3 / 5 / 8 /
   * 11 / 11 at draft counts 0 / 4 / 18 / 29 / 45; a tier between rungs takes
   * the rung below it), written on the row so that the sixteen governments
   * stay rows with a signature each and the count is a field somebody can retune.
   *
   * A leader's extra chair and a card's (`CardSlotRiderEffect`) are added on
   * top by `chairCount`, exactly as they were added on top of the spread.
   */
  chairs: number;
  /**
   * The old M/E/W spread, **left in place and read by nothing** (D1a). The
   * rows keep it because a row is a record; `slotLayout` no longer derives
   * anything from it. A government written after the rework carries none.
   */
  slots?: SlotSpread;
}

export interface DoctrineDef extends CardDefBase {
  /** Which adoption's pool this belongs to. 0 means *no live pool* — deferred. */
  tier: number;
  /**
   * The deck memberships and the band, in the shape every Order row carries
   * (see `OrderDef.decks`). **Every Doctrine row is retired** since the decks
   * rework — a Doctrine is a rare-only reward *draft* now, not a card class —
   * and the two fields are here so that the schema is one schema across the
   * card table: a row of either class says which deck it belongs to and when
   * it may be dealt, whether or not anything deals it.
   */
  decks: DeckId[];
  band: Band;
  /**
   * **Withdrawn from the pool**: never dealt, and still fully readable.
   * `OrderDef.retired` at the Doctrine's scale, and it is a second field rather
   * than one on `CardDefBase` for the reason the pools are two functions: an
   * Order leaves a *pool*, a Doctrine leaves a *tier*, and each is read by the
   * one function that deals its own kind.
   *
   * The distinction it draws is `OrderDef.retired`'s exactly. A Doctrine the
   * design has taken out (Athenaeum of the Road, 2026-09-03) is not a Doctrine
   * that never existed: a save from before the cut may hold it adopted, and a
   * row deleted outright would be a save that cannot be replayed — `anyCardDef`
   * would throw on an id in the log. So the row stays, its effects stay live
   * for whoever holds it, and `poolDoctrines` simply stops dealing it.
   *
   * A tier of 0 says something different and both are needed: that is a row
   * *never finished*, waiting on a pool to be written for it, and it says so in
   * `deferred`. This is a row that was finished, was dealt, and has been taken
   * back out.
   */
  retired?: boolean;
  /**
   * **What adopting this hands over, at the moment it is adopted** — The Muses'
   * Call's *"adopting this calls one great person"*.
   *
   * `OrderDef.onSlot` at the Doctrine's scale, in the shape that field already
   * uses (`OrderSlotGrant`), and it is a second field rather than a widening of
   * that one for the reason `retired` is two fields: an Order enters a *slot*
   * and may leave it and enter it again, a Doctrine is *adopted* and never
   * leaves — so the two are read by the two verbs that settle their own kind.
   *
   * The Order's half needs a once-flag (`PlayerStatecraft.grantedOnSlot`) and
   * this one deliberately has none: `settleDoctrineChoice` pushes the id onto a
   * list that is never spliced, so an adoption *is* the once. That is the same
   * discipline the timed effects keep — a rule made of what the board already
   * says beats a second ledger saying it again.
   *
   * **It is not a `windfallRider` on an adoption occasion**, and the difference
   * is the whole reason this exists. A rider is a *standing* reading — it fires
   * on every occasion of its kind for as long as the card is held — so a rider
   * hung on "a Doctrine was adopted" would have paid a great person at every
   * tier the empire ever reached, four more times over a game, for a card whose
   * printed words say *one*. A grant fired by the verb that takes the card pays
   * exactly what the card says, once, and nothing is written down about it.
   */
  onAdopt?: OrderSlotGrant[];
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
 * **A Doctrine's adoption reads the same shape** (`DoctrineDef.onAdopt`, B1),
 * because it is the same sentence at another scale: a thing handed over at a
 * moment and never again. The name kept the Order's word rather than growing a
 * neutral one — the two verbs that fire it say which moment they mean, and a
 * rename would have moved a field nobody's reading changed.
 *
 * It is deliberately a *named kind of grant* rather than a figure: "gain a great
 * person" is not renown, it is the recruitment the ladder would have opened, so
 * the settlement pours exactly what the ladder still needs through
 * `settleRenownWindfall` and the offer opens the way a Triumph opens one.
 */
export interface OrderSlotGrant {
  /**
   * `'greatPerson'` — the recruitment the ladder would have opened, and the one
   * kind there is.
   *
   * There was a second, `'die'`, until schema 71: The Auspicious Seal handed
   * over a die of the Magister the first time it was slotted. The dice went with
   * the fewer-things pass (`docs/history/fewer-things.md` §1 — faith rerolls a draft
   * now) and the card was retired with them, so the union is one member wide
   * again. A second *kind* is a design decision; a second card wanting the
   * existing one is a JSON row.
   */
  grant: 'greatPerson';
}

export interface OrderDef extends CardDefBase {
  /**
   * The government pool this row was dealt from **before the decks rework**,
   * and the office it fitted. Both **left in place and read by no draw** (D1a):
   * `poolOrders`/`poolOfGovernment` still answer for the retired shelves so a
   * save that holds one of these rows reads as it did, and the Compendium
   * prints the fields, but nothing live deals by them. A row written after the
   * rework carries neither.
   */
  pool?: OrderPool;
  slot?: SlotType;
  /**
   * **Which decks this card belongs to** — the draw's first question since the
   * decks rework (`docs/six-decks-first-cut.md` "The structure"; D1a).
   *
   * One deck is a single-type card, dealt into the position that deck fills.
   * Two decks is a **cross-type** card: one row, one id, one effect, and
   * *either* membership grants access — a seat holding one of the two draws
   * it, and matching both neither doubles its chance nor its effect (rule 3).
   * **Empty is generic**: a row with no membership belongs to every seat, in
   * the third position's generic turn (rule 2), and to nobody's deck in
   * particular. Required on every row, retired ones included, for `rarity`'s
   * reason: a card's home is a decision, not a default. The old rows carry the
   * empty list because no deck was ever assigned to them and they are retired
   * — D1b's rows are the first to name one.
   */
  decks: DeckId[];
  /**
   * **When this card may first be dealt** — the content band (`Band`; the
   * deck sheets' Tier 0 to Tier IV). A card is drawable when the
   * seat has reached the band's rung of the draft ladder **and** its research
   * age (`bandOpen`, `statecraft/draft.ts`), and stays drawable ever after: no
   * pool rotates away. Required on every row, retired ones included.
   */
  band: Band;
  /**
   * **What drafting this hands over, once** — see `CharterSpec`. Present on a
   * charter row and on no other; a row with it is never seated.
   */
  charter?: CharterSpec;
  /**
   * **How often this card is dealt** — the draw's only weight (the user's
   * ruling of 2026-09-04: *"players are given an option to skip and increase
   * the rarity of their next draft"*).
   *
   * Three rungs, taken from the worksheet's own marks (● common · ◆ uncommon ·
   * ○ rare in `docs/orders-and-doctrines.md`, and a sync test pins the mark to
   * this field). It weights the bag and nothing else: a rare card is not a
   * stronger card, it is a card the deck holds back — which is what makes the
   * skip worth anything, because a pass is paid for in the only currency the
   * draft has, *what the next hand is likely to be*.
   *
   * Since the decks rework the rarity is drawn **first** — a rung at the odds
   * of `StatecraftConfig.rarityOdds`, then a card uniformly within the rung —
   * so a rarity is a probability target and never a per-card weight that
   * shrinks as the catalogue grows (the design doc's rule 1). Required on
   * every row, retired ones included, so adding a card is a decision about how
   * often it turns up rather than a field somebody forgets and a default
   * quietly answers for. The pity a skip buys is `skipPity`.
   */
  rarity: OrderRarity;
  /** True for a card with no archetype thread. Presentation only. */
  neutral?: boolean;
  /** What slotting this hands over, once per game. See `OrderSlotGrant`. */
  onSlot?: OrderSlotGrant[];
  /**
   * **Withdrawn from the pool**: never dealt, and still fully readable.
   *
   * A card the design has taken out (The Loose Rein, 2026-08-28) rather than a
   * card that never existed, and the distinction is the whole point: an empire
   * that holds it holds it still — `anyCardDef` resolves the id and its effects
   * fold like any other's — and a row deleted outright would be a log that
   * cannot be replayed. So the row stays, its effects stay live for whoever
   * holds it, and `poolOrders` simply stops dealing it.
   *
   * The row is not, however, keeping an *older* save readable: `loadGame` tests
   * the schema for exact equality and a retirement is itself a bump, so the
   * only save that can name a withdrawn card is one this build wrote. What the
   * row is really for is the two readings above plus the third: the Compendium
   * walks `ORDER_IDS` and `DOCTRINE_IDS` unfiltered, so **a withdrawn card is
   * still printed in full** — name, slot, pool, rarity, line, clauses, flavour
   * and note — which is what "still fully readable" means and why none of those
   * fields may be trimmed off a retired row.
   */
  retired?: boolean;
  /**
   * **Dealt only from this age on** (the user, 2026-09-06: "the era 4 victory
   * cards are showing in the game at age 3, that's a bug, they should only
   * show upon reaching age 4").
   *
   * Governments carry no age gate (ruled), so a seat that climbs the tier
   * ladder quickly opens pool V in Æra III — and the four bead Orders, whose
   * whole text is the last age, were in its hand. This is the row's own gate,
   * read in `drawablePool` (the bag the draw deals from): the empire's
   * `highestAge` must reach it or the row is out of the bag. Absent is every
   * age. A row already held when the gate would have shut it keeps its chair —
   * the gate is on the deal, never on the holding — and `livePool`, the
   * government's whole shelf, stays ungated.
   */
  fromAge?: TechAge;
}

/** The escalating meter, and the seal. Every number the ladder is made of. */
export interface StatecraftMeterConfig {
  /** The first draft's cost. */
  costBase: number;
  /** Linear term on the draft count. */
  costLinear: number;
  /** Exponent on the draft count — the escalation Entry XV asks for. */
  costExponent: number;
  /**
   * How long slotting an Order seals it. `metaRule` may rewrite this.
   *
   * **One number for every shelf**, and the Æra III fork of 2026-09-05 is why
   * that is written down rather than assumed: the fork's proposal was a longer
   * seal from Government III on (`docs/history/age-three.md` section 3) and the user
   * vetoed it the same day — *certain cards you want to slot in and out; that
   * should be part of the game's skill expression*. So a seal is a fixed price
   * for anticipating a posture (Entry XV), never a tax that climbs with the
   * ladder, and a per-pool table is a shape this file deliberately does not
   * have.
   */
  sealTurns: number;
}

/**
 * One rung of the draft ladder: the regular draft count it opens at, and the
 * chairs a government of that rung supplies. See `StatecraftConfig.tierLadder`.
 */
export interface TierRung {
  drafts: number;
  chairs: number;
}

export interface StatecraftConfig {
  meter: StatecraftMeterConfig;
  /**
   * **How often each rung of `OrderDef.rarity` is dealt**, as probability
   * points over the rungs *present in a bag* — the design doc's rule 1, common
   * 60 · uncommon 30 · rare 10, renormalised when a rarity is absent.
   *
   * Points rather than per-card weights, and that is the whole difference from
   * the `rarityWeights` this replaced (D1a): a weight per card made a rarity's
   * share grow with how many cards of it the catalogue held, so a deck with
   * thirty commons and three rares dealt rares far more seldom than a deck with
   * ten and three. A target is a promise about the *hand* — one card in ten is
   * rare — kept whatever the shelf holds, which is the only reading a designer
   * can size a catalogue against. Read in one place (`rarityOdds`,
   * `statecraft/draft.ts`) and drawn in one (`drawRarityFirst`).
   */
  rarityOdds: Record<OrderRarity, number>;
  /**
   * **What one skipped draft moves** out of the common rung's points and into
   * the uncommon and rare rungs' — the pity half of the 2026-09-04 ruling, one
   * turn of the same dial, restated for the rarity-first draw (D1a).
   *
   * Moved rather than added, so the three rungs still sum to what they summed
   * to and a pass is a *shift* of probability rather than a growth of it: with
   * the table at 60/30/10 and this at 10/5, one pass deals 45/40/15, two deal
   * 30/50/20, and the common rung floors at nought rather than going negative.
   * Per consecutive skip (`PlayerStatecraft.orderSkips`, reset by taking a
   * card). Common is deliberately not a key: pity is a promise about the *top*
   * of the deck, and a knob that could raise the commons would be a knob that
   * can undo the promise.
   */
  skipPity: Record<Exclude<OrderRarity, 'common'>, number>;
  /**
   * **What a redraw costs when gold pays for it** — The Brokers' Redraw (batch
   * C3, ruled in `docs/flags.md` item (pppppp)).
   *
   * The faith ladder is unchanged and lives where it always did
   * (`rules.religion.reroll`, folded by `explainRerollCost`); this is the one
   * figure the gold arm adds, a multiple of whatever that ladder quotes. It is
   * here rather than beside the faith ladder because the ladder is a rule of the
   * draft and this is a card's price — a game with no such card never reads it.
   *
   * **Why the figure is twelve.** It started at six, when a hammer cost four
   * gold or one faith: break-even was four and six put gold at a premium. The
   * user's ruling (`docs/flags.md` item (qqqqqq) 3) doubled the faith price of
   * a hammer to two and kept the faith price of a reroll as it was, and asked
   * that the gold price of a reroll rise in line with that change. So the
   * multiple doubled with the faith rate, six to twelve. Note that this is the
   * literal reading of the ruling: measured against hammers alone, one faith is
   * now worth two gold, so twelve is six times break-even rather than one and a
   * half times. One number, and turning it is the whole of retuning the card.
   */
  redraw: {
    /** The faith price times this, floored once, is the gold price. */
    goldMultiple: number;
  };
  // There is deliberately **no `offer` block**. How many cards a draft deals was
  // moved to `rules.offers` by the offer-size pass (Entry XXXI) and folded by
  // `explainOfferSize`, because a wonder, a belief or a great person may widen
  // it and one evaluator has to answer for all five kinds; the two numbers that
  // sat here were dead the day that landed, and a dead number in a data file is
  // a dial a designer will one day turn expecting something to happen.
  /**
   * **The five rungs of the draft ladder**, one per band: Chiefdom and
   * Government I to IV at regular draft counts 0 · 4 · 18 · 29 · 45, with
   * 3 · 5 · 8 · 11 · 11 chairs (`docs/six-decks-first-cut.md` "Content bands";
   * the chairs are the user's ruling in `docs/decks/deck-design.md` "More
   * chairs"). The fifth rung, for band 4, sits at 45 because that is where the
   * last governments are offered, and keeps eleven chairs because the ruling
   * gives the last government tier eleven. The ladder is **read by the
   * simulation in three places**:
   *
   *   · a **band** opens at its rung's draft count (`bandTierAt`, the tier
   *     half of `bandOpen`);
   *   · a **reward hand** is banked when a seat's regular draft count reaches
   *     any rung but the first (`REWARD_DRAFTS`, read by `settleDraft`);
   *   · a government's **chairs** are its tier's rung (`chairsAtTier`, the
   *     figure written onto each row's `chairs`).
   *
   * The governments are still *offered* at the rows' own tiers
   * (`GOVERNMENT_TIERS`, read off the rows: 4 · 10 · 18 · 29 · 45), which is a
   * different question — a tier between two rungs keeps the rung below it, so
   * the tier-10 rows supply five chairs. The ladder is the design doc's table
   * and a sync test holds the two together.
   */
  tierLadder: TierRung[];
  governments: Record<GovernmentId, GovernmentDef>;
  doctrines: Record<DoctrineId, DoctrineDef>;
  orders: Record<OrderId, OrderDef>;
}

/**
 * **The eight files an Order may come from** — the retired shelf and the seven
 * deck files, in the order the registry folds them: the shelf first (it is the
 * table's history), then the six decks in `DECK_IDS` order, then the commons.
 */
export type DeckFile = DeckId | 'common';

/** The deck files in fold order. `common` last. See `DeckFile`. */
export const DECK_FILES: readonly DeckFile[] = [...DECK_IDS, 'common'];

const DECK_FILE_JSON: Record<DeckFile, { orders: Record<string, unknown> }> = {
  dominion: dominionDeck,
  expansionist: expansionistDeck,
  commerce: commerceDeck,
  devotion: devotionDeck,
  scientific: scientificDeck,
  magisterial: magisterialDeck,
  common: commonDeck,
};

/**
 * **One registry from eight files**, and the one place a collision is caught:
 * an id written twice — in two decks, or in a deck and on the retired shelf —
 * throws at load, because two rows under one id would be a card that pays one
 * thing on one screen and another in the draw. `test/sim/decks.test.ts` pins
 * the uniqueness against the raw files as well, so the failure has a name in
 * the register before it has a stack trace at boot.
 */
function foldOrders(): Record<string, unknown> {
  const folded: Record<string, unknown> = {};
  const from: Record<string, string> = {};
  const add = (file: string, rows: Record<string, unknown>): void => {
    for (const [id, row] of Object.entries(rows)) {
      if (Object.prototype.hasOwnProperty.call(folded, id)) {
        throw new Error(
          `Order "${id}" is written twice: in ${from[id]} and in ${file}. An id is one row.`,
        );
      }
      folded[id] = row;
      from[id] = file;
    }
  };
  add('data/statecraft.json', statecraftJson.orders);
  for (const file of DECK_FILES) add(`data/decks/${file}.json`, DECK_FILE_JSON[file].orders);
  return folded;
}

export const STATECRAFT = {
  ...statecraftJson,
  orders: foldOrders(),
} as unknown as StatecraftConfig;

/**
 * **The ids each deck file carries**, in that file's order — what the doc-sync
 * test reads a deck's table against, and what the register pins (every row in
 * `<deck>.json` names that deck in `decks`; a `common.json` row names none or
 * two).
 */
export const DECK_FILE_ORDERS: Readonly<Record<DeckFile, readonly OrderId[]>> = Object.fromEntries(
  DECK_FILES.map((file) => [file, Object.keys(DECK_FILE_JSON[file].orders) as OrderId[]]),
) as unknown as Record<DeckFile, readonly OrderId[]>;

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
 * includes every belief and every rite — `anyCardDef` in `statecraft.ts` is the
 * lookup that spans all five classes. See `cardDef` above.
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
 * one-field decision: every draw and every screen that lists
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
 *
 * **Every rung has its own pool since 2026-09-05.** The last clause used to be
 * a bare `return 'governmentIII'`, which meant the tier-29 and tier-45
 * governments re-dealt the shelf their predecessor had already emptied: a full
 * game drew no card it had not seen after Æra III, and adopting The Curia or
 * The Empire bought a wider council with nothing new to seat in it.
 */
export function poolOfGovernment(id: GovernmentId): OrderPool {
  const tier = governmentDef(id).tier;
  if (tier <= 0) return 'chiefdom';
  if (tier <= 4) return 'governmentI';
  if (tier <= 10) return 'governmentII';
  if (tier <= 18) return 'governmentIII';
  if (tier <= 29) return 'governmentIV';
  return 'governmentV';
}

/**
 * The Doctrines offered at one adoption tier, in file order — **retired rows
 * excluded**. Never tier 0.
 *
 * `poolOrders`' opposite number, and the one reader of `DoctrineDef.retired`
 * for the same reason: every draw and every screen that lists a tier comes
 * through here, so a row taken out is out of all of them at once and still
 * readable by a save that holds it.
 */
export function poolDoctrines(tier: number): DoctrineId[] {
  if (tier <= 0) return [];
  return DOCTRINE_IDS.filter(
    (id) => doctrineDef(id).tier === tier && doctrineDef(id).retired !== true,
  );
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

/**
 * How many slots of each type a government opens — **every one of them a
 * wildcard since the decks rework** (D1a: chairs are universal). Derived from
 * `chairs` and never from the row's old `slots` field, so the one reading of a
 * government's seating is the count.
 */
export function slotSpread(id: GovernmentId): SlotSpread {
  return { military: 0, economic: 0, wildcard: slotCount(id) };
}

/**
 * The slot *layout* a government produces: one entry per chair, and every
 * entry `'wildcard'` since the decks rework.
 *
 * A flat array still, because the state stores what is *in* each chair by
 * index and an index has to mean the same thing in every reading of it. The
 * three flavours went with the M/E/W spread (D1a); what a government says now
 * is *how many*, and this is that number said as a list so that every reader
 * of the layout — the screen's column, the malice's seating, the position
 * cards — keeps its shape.
 */
export function slotLayout(id: GovernmentId): SlotType[] {
  const layout: SlotType[] = [];
  for (let i = 0; i < slotCount(id); i++) layout.push('wildcard');
  return layout;
}

/** How many chairs a government supplies. The row's own figure, floored at nought. */
export function slotCount(id: GovernmentId): number {
  return Math.max(0, Math.floor(governmentDef(id).chairs));
}

/**
 * Does an Order fit a slot of this type?
 *
 * A **wildcard slot takes anything** — and since the decks rework every chair
 * is one, so this answers `true` for every card in every chair. The typed
 * clause stays for the retired rows' sake: a row that still carries a `slot`
 * fits its own flavour as it always did, which matters to nothing live and
 * keeps the rule readable.
 */
export function orderFitsSlot(order: OrderId, slot: SlotType): boolean {
  return slot === 'wildcard' || orderSlot(order) === slot;
}

/**
 * The office a retired row fitted, or `'wildcard'` for a row written after the
 * rework — **the one reading of `OrderDef.slot`** for the surfaces that still
 * print it (the Compendium's shelf, the old collection grouping). Nothing that
 * deals or seats a card asks this.
 */
export function orderSlot(order: OrderId): SlotType {
  return orderDef(order).slot ?? 'wildcard';
}

// --- the decks ---------------------------------------------------------------

/** The ladder's rungs in draft-count order. See `StatecraftConfig.tierLadder`. */
export const TIER_LADDER: readonly TierRung[] = [...STATECRAFT.tierLadder]
  .map((rung) => ({ drafts: Math.max(0, Math.floor(rung.drafts)), chairs: Math.max(0, Math.floor(rung.chairs)) }))
  .sort((a, b) => a.drafts - b.drafts);

/**
 * **The band tier a draft count has reached** — the index of the highest rung
 * whose draft count is at or below `drafts`, which is what the design doc
 * calls the seat's government tier in the five-stage sense.
 *
 * Read off the **draft count** and never off the adopted government, and that
 * is a decision worth stating: adoption is bankable (Entry XV), so a seat may
 * sit at twenty drafts under the chiefdom with a triple it has not claimed, and
 * a shelf held shut by an unclaimed charter would be a shelf the reward hand at
 * draft eighteen could not deal from. The design doc says the thresholds *"are
 * culture-draft counts, not turns, ages or technology requirements"*, and
 * *"reaching Government I through culture alone"* is the case its age check
 * exists to answer — so culture alone is what reaches it.
 */
export function bandTierAt(drafts: number): Band {
  let tier = 0;
  for (let index = 0; index < TIER_LADDER.length; index++) {
    if (TIER_LADDER[index]!.drafts <= drafts) tier = index;
  }
  return Math.min(LAST_BAND, tier) as Band;
}

/** The chairs the ladder supplies at a government's tier: the rung at or below it. */
export function chairsAtTier(tier: number): number {
  return TIER_LADDER[bandTierAt(tier)]?.chairs ?? 0;
}

/**
 * **The regular draft counts at which a reward hand is banked** — every rung of
 * the ladder but the first (the design doc's "Doctrine reward hands": 4, 18,
 * 29 and, since band 4 was added, 45). Read by `settleDraft`.
 */
export const REWARD_DRAFTS: readonly number[] = TIER_LADDER.slice(1).map((rung) => rung.drafts);

/** Is this row a charter — drafted for its grant, never seated? */
export function isCharter(id: OrderId): boolean {
  return orderDef(id).charter !== undefined;
}

/**
 * **Is this row on any shelf at all?** The one reading of what keeps a row out
 * of every pool, so the three reasons are stated once:
 *
 *   · **retired** — withdrawn, kept for saves and the Compendium (the rule
 *     `OrderDef.retired` states, and every pre-rework row carries it);
 *   · **deferred whole** — a row with a `deferred` sentence and nothing to
 *     slot: no effects and no charter. D1b's convention for a card whose text
 *     needs a shape that does not exist yet: in the data, in the Compendium,
 *     in no pool. A row with effects *and* a deferred half is dealt — the half
 *     that is built is a card.
 *
 * A charter with no effects is dealt: its grant is the whole of the card — but
 * only while the grant names something that exists. **A deferred charter is not
 * dealt** (the D1b audit, `docs/plans/decks-shape-audit.md` "A deferred charter
 * is still dealt"): a charter whose building, technology or rites have not been
 * drawn up yet carries a `deferred` sentence and no effects, and dealing it
 * would seat nothing and write a dead id onto the player's `charteredBuildings`.
 * Two D1b agents worked around it by marking those rows `retired`, which lied
 * about *why* they are off the shelf — a retired row is one the design withdrew,
 * a deferred row is one the design is waiting for. The clause is the honest fix,
 * and it is stated here rather than at the draw so that the Compendium, the
 * doc-sync and the pool all read one answer.
 */
export function orderIsDealt(id: OrderId): boolean {
  const def = orderDef(id);
  if (def.retired === true) return false;
  if (def.effects.length === 0 && def.charter === undefined) return false;
  if (def.effects.length === 0 && def.deferred !== undefined) return false;
  return true;
}

/**
 * **Every dealt row that this set of decks may draw**, in file order — the seat
 * pool's shape without a seat: a generic row (no membership) for everyone, a
 * single or cross-type row when *any* of its decks is held. `deckPoolOf` in
 * `statecraft/draft.ts` asks this of `Player.decks`; the tests and the
 * Compendium ask it of a deck list of their own.
 */
export function ordersForDecks(decks: readonly DeckId[]): OrderId[] {
  return ORDER_IDS.filter((id) => {
    if (!orderIsDealt(id)) return false;
    const home = orderDef(id).decks;
    if (home.length === 0) return true;
    return home.some((deck) => decks.includes(deck));
  });
}

/**
 * **The technologies a charter names**, in file order — the set the research
 * gate asks about (`researchError`, `tech.ts`). Derived from the card rows
 * rather than marked on the tech rows, so a chartered technology is a fact
 * about the charter that opens it and a tech row needs no second flag: a node
 * named here is researchable by a seat whose `charteredTechs` names it and by
 * nobody else, however the tree places it.
 */
export function charteredTechIds(): TechId[] {
  const techs: TechId[] = [];
  for (const id of ORDER_IDS) {
    const tech = orderDef(id).charter?.unlocks.tech;
    if (tech !== undefined && !techs.includes(tech)) techs.push(tech);
  }
  return techs;
}

/** Is this technology one only a charter opens? See `charteredTechIds`. */
export function techIsChartered(tech: TechId): boolean {
  return charteredTechIds().includes(tech);
}
