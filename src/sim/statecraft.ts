/**
 * Statecraft: what culture is *for* (design ledger, Entry XV and XV.b).
 *
 * Two halves live here and they are deliberately one file, because they are one
 * idea read at two scales.
 *
 * **The ladder.** Culture fills an escalating meter; each fill is a draft, and
 * *tier is the draft count* — one number, one ladder. A draft offers 3 new cards
 * and 1 upgrade; a government is offered at tiers 3, 7 and 15 as a fixed triple
 * whose adoption is bankable; adopting swaps the slot spread, amnesties every
 * seal, and opens a Doctrine draft. All of it is `state.rng` at the moment an
 * offer opens, an ordinary command to spend it, and both halves in the log —
 * which is `discoveries.ts`'s shape (Entry XV's first consumer) inherited rather
 * than re-invented.
 *
 * **The evaluator.** Governments, Doctrines and slotted Orders are *effect
 * sources* exactly as a luxury's signature is, and this module is the **only**
 * place in the game that reads a `CardEffect`. `resourceEffects.ts` made that
 * claim for one table; this makes it for three, and the payoff is the same: a
 * new card is a JSON row. Every reader below returns a **labelled list**, and
 * every consumer folds that list into a breakdown it already had — rule 5 read
 * at the scale of a card. Nothing outside this file switches on `effect.kind`.
 *
 * The one-evaluator rule, said precisely
 * --------------------------------------
 * There are twenty-eight shapes in the vocabulary and one walk over them
 * (`liveEffects`). Every reader filters that walk; none of them re-derives which
 * cards are live, which are gated, or how a level scales. That is what keeps the
 * promise true as the table grows — the failure mode of a second walk is a card
 * that works everywhere except in the one ledger somebody forgot.
 *
 * The import cycle with `cities.ts` and `meters.ts`, and why it is safe
 * --------------------------------------------------------------------
 * The same cycle `resourceEffects.ts` documents, for the same reason and with
 * the same guarantee. This module asks `cities.ts` which resources an empire
 * controls and which town is its capital, and asks `meters.ts` where the two
 * meters stand; both of those ask this module for the lines to fold into their
 * own breakdowns. It is a **function-level** cycle only: everything at the top
 * level here is a type or a constant from the data tables, and nothing in this
 * file may grow a top-level call into either.
 *
 * Conditions and recursion
 * ------------------------
 * `conditionRule` can ask about a meter, and a meter's value counts cards. That
 * is a genuine cycle, and it is cut in one stated place: **an empire condition
 * is evaluated against a reading that ignores every condition-gated effect**
 * (`conditionDepth` below). One rule, terminating, and exact for the content
 * that exists — Emergency Powers asks about authority and pays in production
 * and borders, neither of which is authority.
 */

import {
  capitalCityOf,
  cityAt,
  cityResources,
  cityTile,
  controlledResources,
  isCoastalCity,
  nearestOwnedCity,
  resourceCopies,
  tileOwnerCityId,
  tileOwnerPlayerId,
} from './cities';
import {
  type BuildingId,
  type CompletionGrant,
  type ProductionCategory,
  buildingDef,
  buildingPlural,
  isBuildingId,
  isWonder,
} from './buildingData';
import { type Family, greatPersonDef, isGreatPersonId } from './greatPeopleData';
import { improvementDef } from './improvementData';
import { type ProjectId, type ProjectPayout, projectDef } from './projectData';
import { type Tile, getTileAt, neighborTiles, tileHex, wrappedDistance } from './map';
import { authorityOf, happinessOf } from './meters';
import type { ModifierStage } from './modifiers';
import { beliefDef, isBeliefId, isRiteId, riteDef } from './religionData';
import { type CityYieldKey, type ResourceKind, resourceDef, resourceYield } from './resourceData';
import { nextFloat } from './rng';
import { RULES } from './rulesData';
import {
  type City,
  type GameState,
  type Player,
  type TimedEffect,
  type Unit,
  playerById,
} from './state';
import {
  type ActionRuleId,
  type AmplifierTarget,
  type BehaviorRuleId,
  type CardCountScaledEffect,
  type CardDefBase,
  type CardEffect,
  type CardId,
  type CardPayout,
  type CardRule,
  type CardTileYieldEffect,
  type CityScope,
  type CombatCondition,
  type CountKind,
  type DoctrineId,
  type EmpireCondition,
  type GovernmentId,
  type MeterRuleId,
  type OfferRiderScope,
  type OfferRuleId,
  type OrderId,
  type OrderPool,
  type RateSource,
  type SlotType,
  type TileCondition,
  type UnitFilter,
  type WindfallOccasion,
  GOVERNMENT_TIERS,
  ORDER_IDS,
  STARTING_GOVERNMENT,
  STATECRAFT,
  cardDef,
  doctrineDef,
  governmentDef,
  governmentsAtTier,
  isDoctrineId,
  isGovernmentId,
  isOrderId,
  orderDef,
  orderFitsSlot,
  poolDoctrines,
  poolOfGovernment,
  poolOrders,
  previousPool,
  slotCount,
  slotLayout,
} from './statecraftData';
import { isWaterTerrain } from './terrainData';
import { awardOccasion } from './triumphs';
import { highestAge } from './techData';
import { type ModelClass, type UnitTypeId, isCombatant, unitDef } from './unitData';
import { isVisibleTo } from './visibility';

const METER = STATECRAFT.meter;

/** The three kinds a resource can be, for the scopes that ask about all of them. */
const RESOURCE_KINDS: readonly ResourceKind[] = ['bonus', 'strategic', 'luxury'];

// --- the ladder's arithmetic ------------------------------------------------

/**
 * What the `n`-th draft costs, in culture. `n` is the number already taken, so
 * the opening draft is `draftCost(0)`.
 *
 * Escalates by **draft count only, never by city count** — Entry I's third
 * commitment, restated by Entry XV: authority is the only lawful width tax, and
 * a civic cost that grew with the empire would be a second one wearing a hat.
 * The shape is `base + linear·n + n^exp`, which is `growthThreshold`'s shape one
 * scale out, floored for the same reason: a pool of whole numbers wants a whole
 * threshold, or a fraction banked forever eventually decides a draft turn nobody
 * can account for.
 */
export function draftCost(drafts: number): number {
  const n = Math.max(0, Math.floor(drafts));
  return Math.floor(METER.costBase + METER.costLinear * n + n ** METER.costExponent);
}

/** What this player's next draft costs. The fold of the curve and their tier. */
export function nextDraftCost(player: Player): number {
  return draftCost(player.statecraft.drafts);
}

/**
 * How a level scales a printed figure: `×upgradeMultiplier` per level above the
 * first, floored **per figure** so two half-points pay for two halves — and
 * never by less than one whole point per level.
 *
 * In the evaluator rather than in the data (see `statecraftData.ts`): a retune
 * is one number, not sixty-five rows, and an upgraded face is guaranteed to be
 * the printed face's shape rather than a second card that could disagree with
 * it. Magnitude-preserving on a malus too — Conscription's −2 happiness deepens
 * to −3, which is the tradeoff getting sharper as the card gets stronger.
 *
 * **The floor on the advance is the whole of the 2026-08-26 fix** (user: "some
 * cards don't have an upgrade"). `floor(1 × 1.5)` is `1`, so the multiplier
 * swallowed itself on every card whose printed figure was a single point — and
 * that was **nineteen of the sixty-five Orders**, a third of the table, each of
 * them offerable as an upgrade that changed nothing at all. The fix is here
 * rather than in nineteen rows because it is one rule: *an upgrade always
 * advances the number*. A figure of 2 or more is untouched (`floor(2 × 1.5)` is
 * already 3), so nothing that upgraded before upgrades differently now — only
 * ±1 moves, and only to ±2.
 *
 * A card with **no figure at all** cannot be reached from here and is the other
 * half of the fix: see `CardDefBase.upgradable`.
 */
export function scaleByLevel(value: number, level: number): number {
  if (level <= 1 || value === 0) return value;
  const factor = STATECRAFT.upgradeMultiplier ** (level - 1);
  const scaled = value * factor;
  const floored = scaled < 0 ? -Math.floor(-scaled) : Math.floor(scaled);
  const advanced = Math.max(Math.abs(floored), Math.abs(value) + (level - 1));
  return value < 0 ? -advanced : advanced;
}

// --- what a player holds ----------------------------------------------------

/**
 * An Order in the collection, and how deep it has been drafted.
 *
 * Level is on the *holding* rather than on the card, which is the whole of the
 * upgrade slot (Entry XV): a card is one row in the table however many empires
 * hold it and however deeply.
 */
export interface OwnedOrder {
  id: OrderId;
  /** 1 is the printed face. Deepened by the draft's upgrade option. */
  level: number;
}

/**
 * An Order in a slot, and the turn from which it may be taken out again.
 *
 * The seal is stored as an **absolute turn**, not a countdown, and that is
 * deliberate: a countdown is state that has to be ticked, and a phase that ticks
 * it is a phase that can be skipped, run twice, or run in the wrong order. A
 * turn number is compared instead of maintained, so "sealed for 3" is a
 * subtraction the interface does and the simulation never has to remember.
 */
export interface SlottedOrder {
  card: OrderId;
  /** `state.turn >= sealedUntil` means it is free to move. */
  sealedUntil: number;
}

/**
 * A draft: three new cards and, when the player owns anything, one upgrade.
 *
 * The options are an ordered list and a pick is an **index**, never an id —
 * `DiscoveryOffer`'s rule, and here for its reason: an index can only ever name
 * something the player was actually dealt. The upgrade is the *last* option when
 * it is there at all, so "option 4" means the same thing on every card that has
 * four.
 */
export interface OrderOffer {
  /** The new cards, in draw order. */
  options: OrderId[];
  /** The owned card the extra option deepens, or absent on the first draft. */
  upgrade?: OrderId;
}

/** Three Doctrines from one adoption's pool, drawn without replacement. */
export interface DoctrineOffer {
  options: DoctrineId[];
}

/**
 * A government offer, **banked until claimed** (Entry XV: adoption is bankable).
 *
 * It is a fixed triple rather than a draw — the deterministic spine — so the
 * options are read off the table and the *tier* is what is stored. Storing the
 * list anyway would be a second copy of the table that a retune could put out of
 * step with it.
 */
export interface GovernmentOffer {
  tier: number;
  options: GovernmentId[];
}

/**
 * Everything Statecraft knows about one empire.
 *
 * A nested object rather than eight fields on `Player`, because it is one
 * subject with one lifecycle: it is created whole, it is replaced wholesale on
 * adoption, and a screen reads all of it at once.
 *
 * **There is no basket field.** The culture banked toward the next draft *is*
 * `Player.culturePool` — the pool `state.ts` has always described as "banked
 * toward the next social policy" and nothing has ever spent. A second bank would
 * be a second answer to "how close am I", and the two would disagree the first
 * time a windfall paid one of them. Border culture stays its own channel
 * (`City.culture`) and is not spent here, which is what "do not double-spend"
 * means: one turn's culture fills the city's border basket *and* the empire's
 * pool, exactly as it did before this system existed.
 */
export interface PlayerStatecraft {
  /** Drafts taken. **This is the tier.** */
  drafts: number;
  government: GovernmentId;
  /** Every Order held, in the order they were first drafted. */
  orders: OwnedOrder[];
  /**
   * What is in each slot, indexed by the government's `slotLayout`. `null` is
   * an empty slot — a real state, unlike an absent key, because the *number* of
   * slots is a fact about the government and the array's length says so.
   */
  slots: (SlottedOrder | null)[];
  /** Doctrines held, in the order they were taken. Permanent, slotless. */
  doctrines: DoctrineId[];
  /** A draft awaiting a pick, or the key is absent. Blocks End Turn. */
  pendingOrder?: OrderOffer;
  /** A Doctrine draft awaiting a pick, or absent. Blocks End Turn. */
  pendingDoctrine?: DoctrineOffer;
  /** A banked government offer, or absent. Deliberately does **not** block. */
  pendingGovernment?: GovernmentOffer;
}

/** A brand-new empire's Statecraft: the chiefdom, one slot spread, nothing held. */
export function newPlayerStatecraft(): PlayerStatecraft {
  return {
    drafts: 0,
    government: STARTING_GOVERNMENT,
    orders: [],
    slots: slotLayout(STARTING_GOVERNMENT).map(() => null),
    doctrines: [],
  };
}

/** This player's Statecraft, or `undefined` for an id that names nobody. */
export function statecraftOf(state: GameState, playerId: number): PlayerStatecraft | undefined {
  return playerById(state, playerId)?.statecraft;
}

/** The level a player holds a card at, or 0 when they do not hold it. */
export function orderLevel(sc: PlayerStatecraft, id: OrderId): number {
  for (const owned of sc.orders) {
    if (owned.id === id) return owned.level;
  }
  return 0;
}

/** Which slot index holds this card, or −1. */
export function slotOf(sc: PlayerStatecraft, id: OrderId): number {
  for (let i = 0; i < sc.slots.length; i++) {
    if (sc.slots[i]?.card === id) return i;
  }
  return -1;
}

/** Is this card in a slot right now? */
export function isSlotted(sc: PlayerStatecraft, id: OrderId): boolean {
  return slotOf(sc, id) >= 0;
}

/** The slot types this government opens, military first. */
export function slotTypesOf(sc: PlayerStatecraft): SlotType[] {
  return slotLayout(sc.government);
}

/**
 * The **live pool**: this government's cards plus whatever the previous
 * government left unpicked, minus everything already held (Entry XV).
 *
 * Older pools retire — they live on through the upgrade slot, which is the
 * design: a chiefdom card an empire never took is gone by the Age of Empire, and
 * one it *did* take can still be deepened forever. In file order, because a draw
 * that depends on an order must depend on an order the data carries.
 */
export function livePool(sc: PlayerStatecraft): OrderId[] {
  const current = poolOfGovernment(sc.government);
  const before = previousPool(current);
  const pools: OrderPool[] = before === null ? [current] : [before, current];
  const held = new Set(sc.orders.map((owned) => owned.id));
  return ORDER_IDS.filter((id) => pools.includes(orderDef(id).pool) && !held.has(id));
}

// --- the draw ---------------------------------------------------------------

/**
 * `count` ids drawn **without replacement**, uniformly, in the candidate list's
 * own order.
 *
 * `drawDiscoveryOffer`'s walk without the weights: three cards that can be the
 * same card are two cards and a joke, and a pool shorter than the offer hands
 * back what it has — the honest answer, and the one a late-game retired pool
 * needs. Every draw spends exactly one roll whether or not it is used, because a
 * conditional roll is the one way a replay falls out of step with the game it
 * replays.
 */
export function drawWithoutReplacement<T>(state: GameState, from: readonly T[], count: number): T[] {
  const remaining = [...from];
  const wanted = Math.min(Math.max(0, Math.floor(count)), remaining.length);
  const drawn: T[] = [];
  for (let taken = 0; taken < wanted; taken++) {
    const index = Math.min(remaining.length - 1, Math.floor(nextFloat(state.rng) * remaining.length));
    drawn.push(remaining[index]!);
    remaining.splice(index, 1);
  }
  return drawn;
}

// --- how big an offer is ----------------------------------------------------

/**
 * The kinds of offer this game deals, and the axis `explainOfferSize` is asked
 * about.
 *
 * **Open on purpose, and the great people pass took it up**: `'greatPerson'` is
 * a member here, a key of `rules.offers` and a member of `OfferRiderScope` —
 * three edits, no fourth, and every rider that already said `'all'` widened the
 * new draft the day it existed without anybody revisiting a card. Nothing
 * switches over these names: the base is an index into the rules block and a
 * rider matches by equality or by `'all'`.
 */
export type OfferKind = 'order' | 'doctrine' | 'belief' | 'discovery' | 'greatPerson';

/** One contribution to how many cards an offer deals. Rule 5, for a count. */
export interface OfferSizeLine {
  /**
   * Where the number came from: the table itself, a card's own label ("Wonder ·
   * The Oracle"), or the cap. The interface prints these verbatim — see the
   * offer header — so no consumer composes a second sentence about a card.
   */
  source: string;
  /** The **difference** this line makes to the running count, signed. */
  delta: number;
}

/** What the table deals before any card widens it. One label per kind. */
const OFFER_BASE_WORDS: Record<OfferKind, string> = {
  order: 'a draft',
  doctrine: 'a doctrine draft',
  belief: 'a consecration',
  discovery: 'a discovery',
  greatPerson: 'a great-person offer',
};

/**
 * How many cards an offer of this kind deals *this empire, right now* — as the
 * ordered list it is the fold of (rule 5, at the scale of a decision).
 *
 * **One evaluator for four drafts.** A Statecraft draft, a Doctrine triple, a
 * consecration and a claimed ruin all ask this, so a card that says "every draft
 * shows one more card" is read once and lands on all of them — which is the
 * whole point: The Oracle (+1 Statecraft draft) and the Leaning Tower (+1 in
 * every draft of every kind) are JSON rows, and the great person who does the
 * same is a row on another table read through the same fold.
 *
 * The lines, in order:
 *
 *   1. **the base**, `rules.offers[kind]` — every number data, as ever.
 *   2. **one line per live `offerRider`** whose `offer` is this kind or `'all'`,
 *      from every source `liveEffects` walks. A wonder standing in a city, a
 *      belief, a Doctrine and an Order are all the same sentence here, and none
 *      of them needed code.
 *   3. **the cap**, `rules.offers.max`, as a negative line — so an offer that was
 *      trimmed says it was trimmed rather than quietly ignoring a card the
 *      player paid for.
 *
 * The Statecraft draft's upgrade face is deliberately **not** in this count: a
 * rider adds to the *new* cards, and "3 new + 1 upgrade" becomes "4 new + 1
 * upgrade". The upgrade is one card because it is one question (deepen or
 * widen), and two of them would be a different question.
 */
export function explainOfferSize(
  state: GameState,
  playerId: number,
  kind: OfferKind,
): OfferSizeLine[] {
  const lines: OfferSizeLine[] = [
    { source: OFFER_BASE_WORDS[kind], delta: Math.max(0, Math.floor(RULES.offers[kind])) },
  ];
  let running = lines[0]!.delta;

  for (const { source, level, effect } of effectsOfKind(state, playerId, 'offerRider')) {
    if (effect.offer !== kind && effect.offer !== 'all') continue;
    // A rider with no figure deals the ordinary one card, so a data row may say
    // only which draft it widens. Scaled by level like every other figure in
    // the vocabulary — a deeply drafted Order deals more, and the cap below is
    // what stops that becoming a spread nobody can read.
    const extra = scaleByLevel(effect.extra ?? 1, level);
    if (extra === 0) continue;
    lines.push({ source, delta: extra });
    running += extra;
  }

  const max = Math.max(1, Math.floor(RULES.offers.max));
  if (running > max) lines.push({ source: `the table's limit of ${max}`, delta: max - running });
  return lines;
}

/** The fold of `explainOfferSize`, and the only sum of one. */
export function foldOfferSize(lines: readonly OfferSizeLine[]): number {
  let total = 0;
  for (const line of lines) total += line.delta;
  return total;
}

/**
 * How many cards this offer deals. The fold, and the **one** number every
 * generator draws to.
 *
 * Asked at the moment the offer opens and never again — the trap the whole
 * Statecraft chapter is built on (an offer is drawn once and spent by a
 * command), which for a *size* matters twice over: an empire that finishes a
 * wonder between the draw and the click would otherwise be shown a hand with a
 * card missing, and under simultaneous turns two seats look at different times.
 * The drawn array is the offer; its length is the size, for good.
 */
export function offerSize(state: GameState, playerId: number, kind: OfferKind): number {
  return foldOfferSize(explainOfferSize(state, playerId, kind));
}

/**
 * Deals one draft: `offerSize` cards from the live pool, plus one owned card
 * rolled as the upgrade target.
 *
 * The upgrade is rolled from what the player *holds* rather than chosen by them,
 * and that is Entry XV's shape: every draft is the deckbuilder question — widen
 * or deepen — and a freely chosen upgrade would make it "deepen the best thing I
 * own", which is not a question. It is absent on the opening draft because there
 * is nothing to deepen.
 *
 * Both draws spend the generator in a fixed order (new cards, then the upgrade),
 * so the same state deals the same hand.
 *
 * **A card with no second face is not in the upgrade draw at all** (user,
 * 2026-08-26). `isUpgradable` reads the row; the three cards that answer no are
 * pure switches with no figure to advance, and offering one would be a draft
 * option that changed nothing — see `CardDefBase.upgradable`. Filtering the
 * *pool* rather than re-rolling a bad draw is what keeps the generator honest:
 * the draw still spends exactly one roll, over a smaller bag.
 *
 * **How many new cards is asked of `offerSize`, at the moment the offer opens**
 * — which is why this takes the whole player rather than its `PlayerStatecraft`:
 * a rider may sit on a wonder standing in one of its cities, and the empire is
 * what knows that. The upgrade face stays one however wide the hand gets.
 */
export function drawOrderOffer(state: GameState, player: Player): OrderOffer {
  const sc = player.statecraft;
  const options = drawWithoutReplacement(
    state,
    livePool(sc),
    offerSize(state, player.id, 'order'),
  );
  const deepenable = sc.orders.map((owned) => owned.id).filter(isUpgradable);
  const upgrades = drawWithoutReplacement(state, deepenable, 1);
  const offer: OrderOffer = { options };
  const target = upgrades[0];
  if (target !== undefined) offer.upgrade = target;
  return offer;
}

/**
 * Can this card be deepened at all? `CardDefBase.upgradable`, read in the one
 * place that matters and exported because the collection screen greys a card
 * that will never be offered rather than leaving the player to wonder.
 */
export function isUpgradable(id: CardId): boolean {
  return cardDef(id).upgradable !== false;
}

/**
 * Deals one Doctrine draft from a tier's pool, **without replacement within a
 * game** — a Doctrine already held is not offered again (Entry XV.b).
 *
 * `offerSize`'s second caller, and it takes the player for `drawOrderOffer`'s
 * reason: how wide a triple is dealt is a fact about the empire, not about its
 * collection. A pool shorter than the size deals the pool — a late tier whose
 * Doctrines are all held is a smaller hand, never a blocked adoption.
 */
export function drawDoctrineOffer(
  state: GameState,
  player: Player,
  tier: number,
): DoctrineOffer {
  const held = new Set<DoctrineId>(player.statecraft.doctrines);
  const pool = poolDoctrines(tier).filter((id) => !held.has(id));
  return { options: drawWithoutReplacement(state, pool, offerSize(state, player.id, 'doctrine')) };
}

// --- what is live -----------------------------------------------------------

/** One effect, and the card it came from. The unit of the whole evaluator. */
export interface LiveCardEffect {
  /** Display label — "Order · Silk Roads", "Doctrine · River Kings". */
  source: string;
  card: CardId;
  /** 1 for a government or a Doctrine; the holding's level for an Order. */
  level: number;
  effect: CardEffect;
}

/** How each class of card names itself on a breakdown line. One table, one voice. */
const CLASS_WORD = {
  government: 'Government',
  doctrine: 'Doctrine',
  order: 'Order',
  belief: 'Belief',
  rite: 'Rite',
  wonder: 'Wonder',
  legacy: 'Legacy',
} as const;

/**
 * Any card by id, whichever of the **five** classes it is.
 *
 * `cardDef` (`statecraftData.ts`) answers for Statecraft's own three; this one
 * also answers for a pantheon belief and an augur's rite, which are written in
 * this vocabulary and read by this evaluator (ledger Entry XXVIII). It lives
 * here rather than down in the data module for one reason and it is worth
 * stating: the import between `statecraftData.ts` and `religionData.ts` is
 * **type-only in both directions**, which is what keeps a type cycle from
 * becoming a runtime one, and a lookup is a value.
 *
 * A raw id nothing knows is a hand-edited save, and it gets a card-shaped
 * nothing rather than a throw — a breakdown line is not the place to take a
 * whole frame down.
 */
export function anyCardDef(id: CardId): CardDefBase {
  if (isBeliefId(id)) return beliefDef(id);
  if (isRiteId(id)) return riteDef(id);
  if (isOrderId(id) || isDoctrineId(id) || isGovernmentId(id)) return cardDef(id);
  // The **seventh** class, and the one that walks: a great person's legacy is a
  // list of effects in this vocabulary on a row of another table
  // (`greatPeopleData.ts`), adapted into the card shape here rather than copied
  // into a second table that could disagree with it. Asked *before* the building
  // arm below, because the two id spaces are disjoint and the cheaper guard
  // should not have to prove it. A row with an **empty** legacy is a name whose
  // ratified text needs a shape that does not exist yet; it answers a
  // card-shaped nothing, which is exactly what it is worth to this evaluator.
  if (isGreatPersonId(id)) {
    const def = greatPersonDef(id);
    return { name: def.name, flavor: def.epigram, effects: def.legacy, deferred: def.deferred };
  }
  // The sixth class, and the one whose table is not a card table at all: a
  // wonder's effects sit on its **building** row (`BuildingDef.effects`), so the
  // row is adapted into the card shape here rather than copied into a second
  // table that could disagree with it. An ordinary building has no effects and
  // answers an empty card, which is exactly what it is worth to this evaluator.
  if (isBuildingId(id)) {
    const def = buildingDef(id);
    // `deferred` and `note` come across with the effects, because they are the
    // same convention: a wonder whose ratified text needs a shape the vocabulary
    // lacks says so on its row exactly as a great person or an Order does, and
    // `describeCard` prints all three the same way for all seven classes.
    return {
      name: def.name,
      flavor: '',
      effects: def.effects ?? [],
      deferred: def.deferred,
      note: def.note,
    };
  }
  return { name: String(id), flavor: '', effects: [] };
}

/** A card's name across all five classes. `cardName`'s wider twin. */
export function anyCardName(id: CardId): string {
  return anyCardDef(id).name;
}

/**
 * The recursion cut for `conditionRule`. See the module docblock: while an
 * empire condition is being evaluated, gated effects contribute nothing, so a
 * condition that asks about a meter cannot ask about itself.
 */
let conditionDepth = 0;

/**
 * Every effect currently reaching this empire, in one fixed order: the
 * government's signature, then its Doctrines in the order they were taken, then
 * the slotted Orders in **slot order**, then the pantheon's beliefs, then the
 * wonders this empire's cities hold.
 *
 * **The** walk. Every reader below filters this and none of them repeats the
 * gating, the level scaling or the ordering — which is how "one evaluator" stays
 * true as the table grows. Slot order rather than collection order because a
 * slot is a position the player arranged, and a ledger that reordered itself
 * when a card was re-slotted would be a ledger that looks wrong for no reason.
 *
 * `conditionRule` is flattened *here*, so no reader ever sees one: a gated
 * clause either contributes its inner effects or contributes nothing, and it
 * carries its parent card's label either way.
 */
export function liveEffects(state: GameState, playerId: number): LiveCardEffect[] {
  const sc = statecraftOf(state, playerId);
  if (!sc) return [];
  const list: LiveCardEffect[] = [];

  const push = (card: CardId, word: string, level: number, effects: readonly CardEffect[]): void => {
    pushEffects(state, playerId, list, card, word, level, effects, push);
  };

  push(sc.government, CLASS_WORD.government, 1, governmentDef(sc.government).effects);
  for (const id of sc.doctrines) {
    if (!isDoctrineId(id)) continue;
    push(id, CLASS_WORD.doctrine, 1, doctrineDef(id).effects);
  }
  for (const slot of sc.slots) {
    if (!slot || !isOrderId(slot.card)) continue;
    push(slot.card, CLASS_WORD.order, orderLevel(sc, slot.card), orderDef(slot.card).effects);
  }
  // **The fourth source** (ledger Entry XXVIII), and the whole of what religion
  // adds to this walk: a pantheon belief is a card of this vocabulary, held
  // permanently and empire-wide, and it joins the list rather than forking the
  // evaluator. Last, after the law, because that is the order they were built
  // in and an order that reshuffled itself would reorder every ledger.
  const pantheon = playerById(state, playerId)?.pantheon;
  for (const id of pantheon?.beliefs ?? []) {
    if (!isBeliefId(id)) continue;
    push(id, CLASS_WORD.belief, 1, beliefDef(id).effects);
  }
  // **The fifth source** (the wonders framework, 2026-08-27): the wonders
  // standing in this empire's cities. Last, after the law and the gods, for the
  // reason the beliefs are last — the order they were built in, so no ledger
  // reshuffles itself.
  //
  // Asked of the **board** rather than of `state.wonders`, and that is the whole
  // of how a captured wonder changes sides: the claim register records who first
  // raised it and never moves, while the effects follow the city's `buildings`
  // list, so a conqueror inherits the walls, the granary and the Oracle together
  // — the same reading `City.timed` takes of a rite performed on a place.
  //
  // The empty-register guard is not an optimisation of the rare case, it is the
  // ordinary one: this walk runs several times per city per turn, and in a game
  // where nobody has finished a wonder there is nothing here to sweep for.
  if (state.wonders.length > 0) {
    for (const city of state.cities) {
      if (city.ownerId !== playerId) continue;
      for (const id of city.buildings) {
        if (!isWonder(id)) continue;
        push(id, CLASS_WORD.wonder, 1, buildingDef(id).effects ?? []);
      }
    }
  }
  // **The sixth source** (`docs/great-people.md`): the legacies of every great
  // person this empire has spent — *they served you; their legacy remains*.
  // Last, after the law, the gods and the stones, for the reason each of those
  // is last in turn: it is the order they were acquired in, so no ledger
  // reshuffles itself.
  //
  // Read off `Player.legacies` and nowhere else. A person is on the board and
  // spent, or it is a line here; there is no third state, and nothing revokes a
  // legacy — which is why Archimedes' "lost the turn an enemy enters his city"
  // is a *deferred* half on his row rather than a rule hiding in this walk.
  for (const id of playerById(state, playerId)?.legacies ?? []) {
    if (!isGreatPersonId(id)) continue;
    push(id, CLASS_WORD.legacy, 1, greatPersonDef(id).legacy);
  }
  return list;
}

/**
 * The recursion-safe walk one card's effects take into a live list.
 *
 * Extracted out of `liveEffects` so the **timed** sources can take exactly the
 * same walk — the `conditionRule` flattening, the label, the cut — instead of a
 * second one that could disagree about any of the three. `recur` is the caller's
 * own push, so a nested clause carries the parent's word and level.
 */
function pushEffects(
  state: GameState,
  playerId: number,
  list: LiveCardEffect[],
  card: CardId,
  word: string,
  level: number,
  effects: readonly CardEffect[],
  recur: (card: CardId, word: string, level: number, effects: readonly CardEffect[]) => void,
): void {
  for (const effect of effects) {
    if (effect.kind === 'conditionRule') {
      // The cut. Inside a condition's own evaluation every gate is closed, so
      // a meter that counts cards cannot count a card that asks about it.
      if (conditionDepth > 0) continue;
      conditionDepth += 1;
      let open: boolean;
      try {
        open = empireConditionHolds(state, playerId, effect.when);
      } finally {
        conditionDepth -= 1;
      }
      if (!open) continue;
      recur(card, word, level, effect.then);
      continue;
    }
    list.push({ source: `${word} · ${anyCardDef(card).name}`, card, level, effect });
  }
}

/**
 * Is this timed effect still running? **The** reading, and it is a comparison.
 *
 * See `TimedEffect` (`state.ts`): an expiry is an absolute turn and nothing ever
 * ticks anything. Everything that shows or folds a rite asks this, so a swept
 * list and an unswept one are the same game.
 */
export function timedEffectIsLive(state: GameState, timed: TimedEffect): boolean {
  return state.turn < timed.expiresTurn;
}

/** How many turns a rite has left, for the label. Never negative. */
export function timedTurnsLeft(state: GameState, timed: TimedEffect): number {
  return Math.max(0, timed.expiresTurn - state.turn);
}

/**
 * The live effects a holder's own rites contribute, labelled with what they are
 * and how long they have left.
 *
 * `playerId` is whose empire the conditions are asked of — the *holder's owner*,
 * not the augur who performed the rite: a captured city's Omen Reading pays its
 * new owner (see `City.timed`).
 */
function timedLive(
  state: GameState,
  playerId: number,
  holder: { timed?: TimedEffect[] },
): LiveCardEffect[] {
  const timed = holder.timed;
  if (!timed || timed.length === 0) return [];
  const list: LiveCardEffect[] = [];
  for (const entry of timed) {
    if (!timedEffectIsLive(state, entry)) continue;
    // Which *kind* of blessing this is, asked of the id: an augur's rite and a
    // great person's parting gift both hang on a town or a piece by exactly the
    // same mechanism, and the only thing that differs is what to call it. One
    // question, in the one place the label is written.
    const kind = isGreatPersonId(entry.card) ? CLASS_WORD.legacy : CLASS_WORD.rite;
    const word = `${kind} · ${anyCardDef(entry.card).name} (${timedTurnsLeft(
      state,
      entry,
    )} turns left)`;
    // The label is already whole, so the walk is handed a word that produces it:
    // `pushEffects` writes `word · name`, and a rite's name is in the word.
    const push = (card: CardId, _word: string, level: number, effects: readonly CardEffect[]): void => {
      for (const nested of effects) {
        if (nested.kind === 'conditionRule') {
          pushEffects(state, playerId, list, card, _word, level, [nested], push);
          continue;
        }
        list.push({ source: word, card, level, effect: nested });
      }
    };
    push(entry.card, word, 1, [entry.effect]);
  }
  return list;
}

/**
 * Every effect reaching **this city**: its empire's cards (which since the
 * wonders framework include the wonders standing anywhere in the empire — see
 * `liveEffects`, whose fifth source they are), then its own live rites.
 *
 * A wonder's *city-scoped* clause needs nothing special here: it says
 * `{ test: 'hasBuilding', building: <itself> }` and `cityScopeAdmits` answers
 * it off the town's own `buildings` list, which is true in exactly one city.
 *
 * The seam Entry XXVIII opens, and it is deliberately one function rather than a
 * flag on `liveEffects`: an empire's law is the same in every town and a rite is
 * not, so a reader that has a city in hand asks this and a reader that has only
 * a player asks `liveEffects`. Every city-scoped reader below was moved onto it
 * in one pass, which is what makes "a timed percentage is an ordinary
 * percentage" true rather than aspirational.
 */
export function liveCityEffects(state: GameState, city: City): LiveCardEffect[] {
  return [...liveEffects(state, city.ownerId), ...timedLive(state, city.ownerId, city)];
}

/** Every effect reaching **this unit**: its empire's cards, then its own rites. */
export function liveUnitEffects(state: GameState, unit: Unit): LiveCardEffect[] {
  return [...liveEffects(state, unit.ownerId), ...timedLive(state, unit.ownerId, unit)];
}

/** One live list narrowed to one kind. The shape every reader below is built on. */
function pickKind<K extends CardEffect['kind']>(
  live: readonly LiveCardEffect[],
  kind: K,
): { source: string; card: CardId; level: number; effect: Extract<CardEffect, { kind: K }> }[] {
  const list: {
    source: string;
    card: CardId;
    level: number;
    effect: Extract<CardEffect, { kind: K }>;
  }[] = [];
  for (const entry of live) {
    if (entry.effect.kind !== kind) continue;
    list.push({
      source: entry.source,
      card: entry.card,
      level: entry.level,
      effect: entry.effect as Extract<CardEffect, { kind: K }>,
    });
  }
  return list;
}

/** Every live effect of one kind for an **empire**. */
function effectsOfKind<K extends CardEffect['kind']>(
  state: GameState,
  playerId: number,
  kind: K,
): { source: string; card: CardId; level: number; effect: Extract<CardEffect, { kind: K }> }[] {
  return pickKind(liveEffects(state, playerId), kind);
}

/** Every live effect of one kind for **one city**, its own rites included. */
function cityEffectsOfKind<K extends CardEffect['kind']>(
  state: GameState,
  city: City,
  kind: K,
): { source: string; card: CardId; level: number; effect: Extract<CardEffect, { kind: K }> }[] {
  return pickKind(liveCityEffects(state, city), kind);
}

// --- conditions -------------------------------------------------------------

/** How many cities this player holds. Walks `state.cities`, which is founding order. */
function cityCount(state: GameState, playerId: number): number {
  let count = 0;
  for (const city of state.cities) {
    if (city.ownerId === playerId) count += 1;
  }
  return count;
}

/**
 * Does this empire condition hold? See the module docblock for the recursion
 * cut that makes the two meter arms terminate.
 */
function empireConditionHolds(
  state: GameState,
  playerId: number,
  when: EmpireCondition,
): boolean {
  const test = when.test;
  switch (test) {
    case 'cityCountAtMost':
      return cityCount(state, playerId) <= when.value;
    case 'cityCountAtLeast':
      return cityCount(state, playerId) >= when.value;
    case 'authorityNegative':
      // Imported lazily through the function-level cycle documented at the top.
      return authorityReading(state, playerId) < 0;
    case 'happinessNegative':
      return happinessReading(state, playerId) < 0;
    default: {
      const unhandled: never = test;
      void unhandled;
      return false;
    }
  }
}

/**
 * The two meter readings.
 *
 * Named wrappers rather than bare calls so that the *one* place this module
 * reaches into `meters.ts` is greppable — that edge is the function-level half
 * of the cycle the docblock describes, and the recursion cut above is what makes
 * it safe to take.
 */
function authorityReading(state: GameState, playerId: number): number {
  return authorityOf(state, playerId);
}

function happinessReading(state: GameState, playerId: number): number {
  return happinessOf(state, playerId);
}

// --- city scopes ------------------------------------------------------------

/** Is a mountain within one hex of this town? */
function isMountainAdjacent(state: GameState, city: City): boolean {
  const tile = getTileAt(state.map, city.col, city.row);
  if (!tile) return false;
  if (tile.terrain === 'mountain') return true;
  for (const neighbour of neighborTiles(state.map, tileHex(tile))) {
    if (neighbour.terrain === 'mountain') return true;
  }
  return false;
}

/** Default reach of the `frontier` scope, in hexes. */
const FRONTIER_RADIUS = 3;

/**
 * Is another civilization's ground within `radius` of this town?
 *
 * Asked of `tileOwner`, which is the board's own answer, and it counts *any*
 * other seat including the wild's — the wild owns no ground, so in practice this
 * is "a rival's border is close". A sweep of the disc rather than of the map,
 * because a frontier is a local fact and the disc is 37 tiles at radius 3.
 */
function isFrontierCity(state: GameState, city: City, radius: number): boolean {
  const centre = getTileAt(state.map, city.col, city.row);
  if (!centre) return false;
  const eye = tileHex(centre);
  for (const tile of state.map.tiles) {
    const owner = tileOwnerPlayerId(state, tile.col, tile.row);
    if (owner === null || owner === city.ownerId) continue;
    if (wrappedDistance(state.map, eye, tileHex(tile)) <= radius) return true;
  }
  return false;
}

/**
 * Does a scoped effect land in this city? Absent scope means every city.
 *
 * `scopeAdmits` in `resourceEffects.ts` widened from two words to a shape — one
 * evaluator for every scope a card can name, so a new scope is one arm here and
 * nothing in the card that wanted it.
 */
export function cityScopeAdmits(state: GameState, city: City, scope?: CityScope): boolean {
  if (!scope) return true;
  const test = scope.test;
  switch (test) {
    case 'coastal':
      return isCoastalCity(state, city);
    case 'freshwater':
      return cityTile(state.map, city).freshwater;
    case 'notFreshwater':
      return !cityTile(state.map, city).freshwater;
    case 'mountainAdjacent':
      return isMountainAdjacent(state, city);
    case 'frontier':
      return isFrontierCity(state, city, scope.radius ?? FRONTIER_RADIUS);
    case 'captured':
      return city.captured;
    case 'capital':
      return capitalCityOf(state, city.ownerId)?.id === city.id;
    case 'populationAtLeast':
      return city.population >= scope.value;
    case 'holding': {
      // Asked across all three kinds, because a card may name a bonus resource
      // and a luxury in one breath (Quarrymen's Guild: stone or marble).
      for (const kind of RESOURCE_KINDS) {
        const held = cityResources(state, city, kind);
        if (scope.resources.some((id) => held.includes(id))) return true;
      }
      return false;
    }
    case 'holdingCategory': {
      const held = cityResources(state, city, scope.category as ResourceKind);
      return held.length > 0;
    }
    case 'hasBuilding':
      return city.buildings.includes(scope.building);
    case 'onTerrain':
      // The centre's own hex and nothing wider. See the scope's docblock.
      return cityTile(state.map, city).terrain === scope.terrain;
    case 'all': {
      // Recursion into the same evaluator, which is the whole reason the
      // composite is a scope rather than a second field on every effect.
      for (const inner of scope.of) {
        if (!cityScopeAdmits(state, city, inner)) return false;
      }
      return true;
    }
    default: {
      const unhandled: never = test;
      void unhandled;
      return true;
    }
  }
}

/** What a scope says about where a line landed, for the label. */
function scopeNote(scope?: CityScope): string | null {
  if (!scope) return null;
  const test = scope.test;
  switch (test) {
    case 'coastal':
      return 'coastal city';
    case 'freshwater':
      return 'fresh water';
    case 'notFreshwater':
      return 'no fresh water';
    case 'mountainAdjacent':
      return 'mountain hold';
    case 'frontier':
      return 'frontier city';
    case 'captured':
      return 'conquered city';
    case 'capital':
      return 'capital';
    case 'populationAtLeast':
      return `size ${scope.value}+`;
    case 'holding':
      return scope.resources.map((id) => resourceDef(id).name).join('/');
    case 'holdingCategory':
      return `${scope.category} seam`;
    case 'hasBuilding':
      return buildingDef(scope.building).name.toLowerCase();
    case 'onTerrain':
      return `${scope.terrain} city`;
    case 'all':
      return scope.of.map((inner) => scopeNote(inner)).filter((note) => note !== null).join(' + ');
    default: {
      const unhandled: never = test;
      void unhandled;
      return null;
    }
  }
}

/** A label that says which line of a card this is. `resourceEffects`' `label`. */
function label(source: string, note: string | null): string {
  return note === null ? source : `${source} · ${note}`;
}

// --- counts and rates -------------------------------------------------------

/**
 * What a `countScaled` counts, in one place.
 *
 * `city` is present for the city-scoped counts and ignored by the rest; a
 * city-scoped count asked with no city answers 0, which is the honest answer for
 * an empire-scale reader that has no town in hand.
 */
function countOf(
  state: GameState,
  playerId: number,
  effect: CardCountScaledEffect,
  city?: City,
): number {
  const count = effect.count;
  switch (count) {
    case 'uniqueLuxuries':
      return controlledResources(state, playerId, 'luxury').length;
    case 'luxuryCopies': {
      let total = 0;
      for (const id of controlledResources(state, playerId, 'luxury')) {
        total += resourceCopies(state, playerId, id);
      }
      return total;
    }
    case 'improvedBonusResources': {
      // **"In this city" is a different sweep of the same question** (the Temple
      // of Artemis). At empire scale the count is of *copies* — two improved
      // wheat fields are two — because that is what the ratified table means by
      // "improved bonus resources" across a realm. At town scale it is asked of
      // the town's own holdings (`cityResources`), which is the uniqueness
      // reading every city-scale resource question already takes
      // (`resourceEffects.ts`): two wheat fields in one city are one holding,
      // and the sweep is over that city's tiles rather than the whole map.
      if (effect.within === 'city') {
        return city ? cityResources(state, city, 'bonus').length : 0;
      }
      let total = 0;
      for (const id of controlledResources(state, playerId, 'bonus')) {
        total += resourceCopies(state, playerId, id);
      }
      return total;
    }
    case 'cities':
      return cityCount(state, playerId);
    case 'population': {
      let total = 0;
      for (const town of state.cities) {
        if (town.ownerId === playerId) total += town.population;
      }
      return total;
    }
    case 'capitalPopulation':
      return capitalCityOf(state, playerId)?.population ?? 0;
    case 'garrison':
      return city ? garrisonOf(state, city).length : 0;
    case 'garrisonWatch': {
      if (!city) return 0;
      // A fortified unit is worth 1, plus 1 more per turn it has been dug in —
      // "the longer the watch, the steadier the town". An unfortified garrison
      // is not a watch and pays nothing.
      let total = 0;
      for (const unit of garrisonOf(state, city)) {
        if (unit.fortifiedTurns === undefined) continue;
        total += 1 + unit.fortifiedTurns;
      }
      return total;
    }
    case 'workedHills': {
      if (!city) return 0;
      let total = 0;
      for (const cell of city.workedTiles) {
        const tile = getTileAt(state.map, cell.col, cell.row);
        if (tile?.hills) total += 1;
      }
      return total;
    }
    case 'bankedFaith':
      return Math.max(0, Math.floor(playerById(state, playerId)?.faithPool ?? 0));
    case 'bankedGold':
      return Math.max(0, Math.floor(playerById(state, playerId)?.gold ?? 0));
    case 'visibleCamps': {
      let total = 0;
      for (const camp of state.camps) {
        if (isVisibleTo(state, playerId, camp.col, camp.row)) total += 1;
      }
      return total;
    }
    case 'chargedAugurs': {
      if (!city) return 0;
      // Court Augurs. "Stationed" is the city's own hex, which is where a
      // garrison stands, and "with a rite left in it" is `chargesLeft` — an
      // augur that has spent its last charge is not on the board at all, so the
      // test is really "is this piece an augur of this empire, standing here".
      let total = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== city.ownerId) continue;
        if (unit.col !== city.col || unit.row !== city.row) continue;
        if (unitDef(unit.type).consecrates !== true) continue;
        if ((unit.chargesLeft ?? 0) < 1) continue;
        total += 1;
      }
      return total;
    }
    case 'scienceBuildings': {
      if (!city) return 0;
      // Omen Reading. "Buildings that supply science" is read off the building
      // rows — flat science or science per citizen — so a retune of the library
      // moves the rite with it, and a new science building joins for free.
      let total = 0;
      for (const id of city.buildings) {
        const def = buildingDef(id);
        if ((def.science ?? 0) > 0 || (def.sciencePerPop ?? 0) > 0) total += 1;
      }
      return total;
    }
    case 'buildingsOfKind': {
      // A named building, counted once per town that has raised it — the Circus
      // Maximus' barracks and Notre-Dame's temples. A row with no `building` is
      // a data error rather than "count everything": it would silently pay per
      // *city*, which is a count that already exists.
      const wanted = effect.building;
      if (wanted === undefined) return 0;
      if (effect.within === 'city') return city?.buildings.includes(wanted) ? 1 : 0;
      let total = 0;
      for (const town of state.cities) {
        if (town.ownerId !== playerId) continue;
        if (town.buildings.includes(wanted)) total += 1;
      }
      return total;
    }
    case 'buildingsInCity':
      return city ? city.buildings.length : 0;
    case 'workedTilesInCity':
      return city ? city.workedTiles.length : 0;
    default: {
      const unhandled: never = count;
      void unhandled;
      return 0;
    }
  }
}

/** The combat units standing in a city, in `state.units` order. */
function garrisonOf(state: GameState, city: City): Unit[] {
  const list: Unit[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== city.ownerId) continue;
    if (unit.col !== city.col || unit.row !== city.row) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    list.push(unit);
  }
  return list;
}

/**
 * What a `rateConversion` reads.
 *
 * The three `…PerTurn` sources are handed in by `collectYields`, which has just
 * computed them — asking the yields again here would be a second sweep of every
 * city and a second answer. The two meter sources are read live, and only their
 * **positive** part counts: "per point of positive happiness" is what the cards
 * say, and a conversion that paid a malus would be a card that rewards misery.
 */
export interface RateReading {
  faithPerTurn?: number;
  culturePerTurn?: number;
  goldPerTurn?: number;
}

function rateOf(
  state: GameState,
  playerId: number,
  from: RateSource,
  rates: RateReading,
): number {
  switch (from) {
    case 'faithPerTurn':
      return Math.max(0, Math.floor(rates.faithPerTurn ?? 0));
    case 'culturePerTurn':
      return Math.max(0, Math.floor(rates.culturePerTurn ?? 0));
    case 'goldPerTurn':
      return Math.max(0, Math.floor(rates.goldPerTurn ?? 0));
    case 'happiness':
      return Math.max(0, happinessReading(state, playerId));
    case 'authority':
      return Math.max(0, authorityReading(state, playerId));
    default: {
      const unhandled: never = from;
      void unhandled;
      return 0;
    }
  }
}

/**
 * The counts that are asked **of a town** rather than of an empire.
 *
 * The register for the one reader that has to know the difference
 * (`cardHappiness`, which sums a city count across the realm). `countOf` answers
 * 0 for a city count with no city, so this is about *which question* rather than
 * about a guard — and it is a list rather than a chain of `||` so that a count
 * added to the union is added here beside it.
 */
const CITY_SCOPED_COUNTS: readonly CountKind[] = [
  'garrison',
  'garrisonWatch',
  'workedHills',
  'chargedAugurs',
  'scienceBuildings',
  'buildingsInCity',
  'workedTilesInCity',
];

/**
 * Is *this line* asked of a town rather than of a realm?
 *
 * The register above says which counts can only ever be asked of a town;
 * `within: 'city'` is a **line** narrowing a count that could be asked either
 * way (the Temple of Artemis' bonus resources), so the question is about the
 * effect and not only about the `CountKind`. One predicate, so a reader that
 * sums across the empire's towns and one that is handed a single town agree
 * about which is which.
 */
function isCityScopedCount(effect: CardCountScaledEffect): boolean {
  return effect.within === 'city' || CITY_SCOPED_COUNTS.includes(effect.count);
}

/** How many helpings a count (or a rate) buys, capped where the design caps it. */
function helpings(total: number, per: number | undefined, max: number | undefined): number {
  const step = per === undefined || per <= 0 ? 1 : per;
  let count = Math.floor(total / step);
  if (max !== undefined) count = Math.min(count, max);
  return Math.max(0, count);
}

// --- flat yields ------------------------------------------------------------

/** One line of what a card pays, in all six voices. `ResourceYieldLine`'s twin. */
export interface CardYieldLine {
  card: CardId;
  source: string;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

function emptyLine(card: CardId, source: string): CardYieldLine {
  return { card, source, food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
}

const VOICES: readonly CityYieldKey[] = [
  'food',
  'production',
  'gold',
  'science',
  'culture',
  'faith',
];

/** True when a line pays nothing at all. Such lines are never in a list. */
function paysSomething(line: CardYieldLine): boolean {
  return VOICES.some((key) => line[key] !== 0);
}

/**
 * Every flat yield this empire's cards pay **this city**: the `cityYields`
 * shapes a scope admits, then every city-scoped `countScaled` payout.
 *
 * Folded into `cityYields` exactly as `cityResourceYields` is, and printed line
 * by line by the city panel — one list, one fold, rule 5.
 */
export function cardCityYields(state: GameState, city: City): CardYieldLine[] {
  const owner = city.ownerId;
  const list: CardYieldLine[] = [];

  for (const { source, card, level, effect } of cityEffectsOfKind(state, city, 'cityYields')) {
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    const line = emptyLine(card, label(source, scopeNote(effect.scope)));
    for (const key of VOICES) line[key] = scaleByLevel(effect[key] ?? 0, level);
    if (paysSomething(line)) list.push(line);
  }

  for (const { source, card, level, effect } of cityEffectsOfKind(state, city, 'countScaled')) {
    const pays = effect.pays;
    if (pays.to !== 'yield' || pays.where !== 'city') continue;
    const times = helpings(countOf(state, owner, effect, city), effect.per, effect.max);
    if (times === 0) continue;
    const line = emptyLine(card, label(source, `×${times}`));
    line[pays.yield] = scaleByLevel(pays.amount, level) * times;
    if (paysSomething(line)) list.push(line);
  }

  return list;
}

/**
 * Every flat yield this empire's cards pay **the empire**, once: `empireYields`,
 * the empire-scoped `countScaled` payouts, and every `rateConversion`.
 *
 * Banked once per player by `collectYields` after every city has collected,
 * which is the whole difference between an empire line and a per-city one.
 * `rates` carries the turn's totals the phase has just computed — see
 * `RateReading` for why they are handed in rather than asked for again.
 */
export function cardEmpireYields(
  state: GameState,
  playerId: number,
  rates: RateReading = {},
): CardYieldLine[] {
  const list: CardYieldLine[] = [];

  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'empireYields')) {
    const line = emptyLine(card, source);
    for (const key of VOICES) line[key] = scaleByLevel(effect[key] ?? 0, level);
    if (paysSomething(line)) list.push(line);
  }

  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'countScaled')) {
    const pays = effect.pays;
    if (pays.to !== 'yield' || pays.where === 'city') continue;
    const times = helpings(countOf(state, playerId, effect), effect.per, effect.max);
    if (times === 0) continue;
    const line = emptyLine(card, label(source, `×${times}`));
    line[pays.yield] = scaleByLevel(pays.amount, level) * times;
    if (paysSomething(line)) list.push(line);
  }

  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'rateConversion')) {
    const pays = effect.pays;
    if (pays.to !== 'yield') continue;
    const times = helpings(rateOf(state, playerId, effect.from, rates), effect.per, undefined);
    if (times === 0) continue;
    const line = emptyLine(card, label(source, `×${times}`));
    line[pays.yield] = scaleByLevel(pays.amount, level) * times;
    if (paysSomething(line)) list.push(line);
  }

  return list;
}

/** The fold of any list of card-yield lines. The only sum of them. */
export function foldCardYields(list: readonly CardYieldLine[]): Record<CityYieldKey, number> {
  const total: Record<CityYieldKey, number> = {
    food: 0,
    production: 0,
    gold: 0,
    science: 0,
    culture: 0,
    faith: 0,
  };
  for (const line of list) {
    for (const key of VOICES) total[key] += line[key];
  }
  return total;
}

// --- tile yields ------------------------------------------------------------

/**
 * One source's line on a **hex**, as `explainTileYield` needs to read it.
 *
 * THE shape that crosses into the tile chain, and it is carried on
 * `TileYieldContext` rather than looked up there for that chain's stated reason:
 * `explainTileYield` knows about a tile and a context and nothing else — no
 * `GameState`, no player, no card table. So the context carries the *answer*
 * ("this empire pays +1 food on a hex with a resource on it") and the tile chain
 * only has to ask whether the hex qualifies.
 *
 * Three producers now write one of these and they are deliberately the same
 * shape (Entry XXVII): a card's `tileYield` (`cardTileLines`, below), a
 * building's `tileYields` (`buildingTileLines`, `buildingEffects.ts`) and a
 * luxury's `improvementYields` (`resourceTileLines`, `resourceEffects.ts`). The
 * tile chain folds one list and has no idea which of the three a line came from,
 * which is exactly what makes a fourth producer a data row.
 */
export interface TileLine {
  source: string;
  on: TileCondition;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

/** The name this shape had when Statecraft was its only producer. */
export type CardTileLine = TileLine;

/** Does this hex satisfy a tile condition? One evaluator, like every other. */
export function tileConditionHolds(tile: Tile, on: TileCondition): boolean {
  const test = on.test;
  switch (test) {
    case 'hasResource':
      return tile.resource !== undefined;
    case 'hills':
      return tile.hills;
    case 'feature':
      return tile.feature === on.feature;
    case 'improved':
      return tile.improvement !== undefined;
    case 'water':
      return isWaterTerrain(tile.terrain);
    case 'improvement':
      return tile.improvement === on.improvement;
    case 'terrain':
      return tile.terrain === on.terrain;
    case 'resourceKind': {
      const id = tile.resource;
      if (id === undefined) return false;
      const def = resourceDef(id);
      if (def.kind !== on.kind) return false;
      // "a bonus resource **that provides food**" — asked of the resource's own
      // row rather than spelled into the belief, so retuning wheat retunes the
      // goddess with it.
      if (on.yields === undefined) return true;
      return resourceYield(id)[on.yields] > 0;
    }
    case 'resource':
      return tile.resource !== undefined && on.resources.includes(tile.resource);
    case 'freshwater':
      return tile.freshwater;
    case 'all': {
      for (const inner of on.of) {
        if (!tileConditionHolds(tile, inner)) return false;
      }
      return true;
    }
    default: {
      const unhandled: never = test;
      void unhandled;
      return false;
    }
  }
}

/**
 * Every `tileYield` line this empire's cards put on the ground, for the context
 * a tile evaluation carries.
 *
 * Computed once per context rather than once per tile: `yieldContextFor` builds
 * it, and a city sweeping twenty hexes asks the card table once.
 */
export function cardTileLines(state: GameState, playerId: number): CardTileLine[] {
  // **Unscoped lines only.** A `scope` is a question about the *owning city*,
  // and this pass has no city in hand — the same reason a granary's water line
  // cannot be resolved here (`TileYieldContext.lines`). The scoped ones are
  // added by `scopedCardTileLines` from `cityContext`, which does.
  return tileLinesFrom(
    pickKind(liveEffects(state, playerId), 'tileYield').filter(
      ({ effect }) => effect.scope === undefined,
    ),
  );
}

/**
 * The `tileYield` lines this empire's cards put on **one town's** ground — the
 * lines whose `scope` names which cities they land in.
 *
 * `timedCityTileLines`' sibling, and it joins `cityContext` for the same reason:
 * "the ground of the city that holds the Hanging Gardens" is a fact about one
 * town, and only a caller holding that town can resolve it. Petra's desert and
 * the Gardens' irrigated farms are both written `hasBuilding` on the wonder's
 * own row, so the answer follows the stones when a town changes hands.
 */
export function scopedCardTileLines(state: GameState, city: City): CardTileLine[] {
  return tileLinesFrom(
    pickKind(liveEffects(state, city.ownerId), 'tileYield')
      .filter(
        ({ effect }) =>
          effect.scope !== undefined && cityScopeAdmits(state, city, effect.scope),
      )
      // Labelled with where it landed, exactly as a scoped `cityYields` line is.
      .map((entry) => ({ ...entry, source: label(entry.source, scopeNote(entry.effect.scope)) })),
  );
}

/**
 * The `tileYield` lines **this city's own rites** put on its ground — the fifth
 * producer of a `TileLine` (Entry XXVIII).
 *
 * A city's, not an empire's, and that is what makes Rite of Plenty say what it
 * says: "*that city's* worked resource tiles gain +1 gold". `cityContext`
 * (`cities.ts`) appends these beside the granary's, which is the one other
 * producer scoped to a single town — same seam, same argument, and the tile
 * chain still cannot tell any of the five apart.
 */
export function timedCityTileLines(state: GameState, city: City): CardTileLine[] {
  return tileLinesFrom(pickKind(timedLive(state, city.ownerId, city), 'tileYield'));
}

/** One list of `tileYield` effects turned into lines. The only such conversion. */
function tileLinesFrom(
  found: readonly { source: string; level: number; effect: CardTileYieldEffect }[],
): CardTileLine[] {
  const list: CardTileLine[] = [];
  for (const { source, level, effect } of found) {
    const line: CardTileLine = {
      source,
      on: effect.on,
      food: scaleByLevel(effect.food ?? 0, level),
      production: scaleByLevel(effect.production ?? 0, level),
      gold: scaleByLevel(effect.gold ?? 0, level),
      science: scaleByLevel(effect.science ?? 0, level),
      culture: scaleByLevel(effect.culture ?? 0, level),
      faith: scaleByLevel(effect.faith ?? 0, level),
    };
    if (VOICES.some((key) => line[key] !== 0)) list.push(line);
  }
  return list;
}

// --- percentages ------------------------------------------------------------

/** One percentage a card puts on a yield, and which of the two stages it joins. */
export interface CardPercentLine {
  card: CardId;
  source: string;
  yield: CityYieldKey;
  percent: number;
  stage: ModifierStage;
}

/**
 * Every percentage this empire's cards put on **this city's** yields — the
 * `percentYields` shapes a scope admits, plus every `countScaled` that pays in
 * percentage points.
 *
 * These join the meters' and the luxuries' in `cityYieldPercents` (`cities.ts`),
 * which sums them **per stage** and applies the two sums once (Entry XVII).
 * Additive inside a stage, never multiplied afterwards: a card that is the
 * fourth source of a percentage on gold is a fourth line in one of two sums.
 *
 * `yield: 'all'` expands here rather than in the data, so The Hermit Crown is
 * one row and reads as six labelled lines — which is what a player folding the
 * panel's arithmetic in their head needs to see.
 */
export function cardPercentYields(state: GameState, city: City): CardPercentLine[] {
  const owner = city.ownerId;
  const list: CardPercentLine[] = [];

  for (const { source, card, level, effect } of cityEffectsOfKind(state, city, 'percentYields')) {
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    const percent = scaleByLevel(effect.percent, level);
    if (percent === 0) continue;
    const stage: ModifierStage = effect.stage ?? 'city';
    const note = scopeNote(effect.scope);
    const keys = effect.yield === 'all' ? VOICES : [effect.yield];
    for (const key of keys) {
      list.push({ card, source: label(source, note), yield: key, percent, stage });
    }
  }

  for (const { source, card, level, effect } of cityEffectsOfKind(state, city, 'countScaled')) {
    const pays = effect.pays;
    if (pays.to !== 'percent') continue;
    const times = helpings(countOf(state, owner, effect, city), effect.per, effect.max);
    if (times === 0) continue;
    const percent = scaleByLevel(pays.percent, level) * times;
    if (percent === 0) continue;
    list.push({ card, source: label(source, `×${times}`), yield: pays.yield, percent, stage: pays.stage });
  }

  return list;
}

/** One percentage a card puts behind a category of build. */
export interface CardProductionLine {
  card: CardId;
  source: string;
  percent: number;
}

/**
 * The hammers this empire's cards put behind `category` — and behind *this
 * unit*, when the row narrows to one silhouette.
 *
 * The card half of `productionModifiers` (`cities.ts`), which folds these
 * together with the buildings' and the luxuries' into one `{ source, percent }`
 * list. There is no Conscription case anywhere in the simulation.
 */
export function cardProduction(
  state: GameState,
  city: City,
  category: ProductionCategory,
  unitType?: UnitTypeId,
): CardProductionLine[] {
  const list: CardProductionLine[] = [];
  for (const { source, card, level, effect } of cityEffectsOfKind(state, city, 'productionBonus')) {
    if (effect.category !== category) continue;
    if (effect.modelClass !== undefined) {
      if (unitType === undefined) continue;
      if (unitDef(unitType).modelClass !== effect.modelClass) continue;
    }
    const percent = scaleByLevel(effect.percent, level);
    if (percent === 0) continue;
    list.push({ card, source, percent });
  }
  return list;
}

/** One percentage a card puts on a named rule. */
export interface CardRuleLine {
  card: CardId;
  source: string;
  percent: number;
}

/**
 * The percentages this empire's cards put on one named rule.
 *
 * `resourceRulePercent`'s twin, over a union three members wider — a luxury
 * cannot make land cheaper or borders faster, and a card can. Six rules, six
 * consumers, one shape.
 */
export function cardRulePercent(
  state: GameState,
  playerId: number,
  rule: CardRule,
  city?: City,
): CardRuleLine[] {
  const list: CardRuleLine[] = [];
  // A **city** may be handed in, and then its own live rites join the empire's
  // law: Consecration of the Bounds is a `rulePercent` on `borderCulture` that
  // hangs on one town for twenty turns, and the borders channel must fold it
  // exactly as it folds a Doctrine's (Entry XXVIII). Every other caller passes
  // no city and reads what it always read.
  const live = city ? liveCityEffects(state, city) : liveEffects(state, playerId);
  for (const { source, card, level, effect } of pickKind(live, 'rulePercent')) {
    if (effect.rule !== rule) continue;
    const percent = scaleByLevel(effect.percent, level);
    if (percent === 0) continue;
    list.push({ card, source, percent });
  }
  return list;
}

/** The fold of any list of rule percentages: summed, applied once. */
export function foldCardRulePercent(list: readonly CardRuleLine[]): number {
  let percent = 0;
  for (const line of list) percent += line.percent;
  return percent;
}

// --- the meters -------------------------------------------------------------

/** One line a card adds to a meter's ledger. */
export interface CardMeterLine {
  card: CardId;
  source: string;
  amount: number;
}

/**
 * The happiness this empire's cards supply, in walk order.
 *
 * A `per: 'city'` line is multiplied by the cities its scope admits — "cities of
 * 6+ gain +2 each" is one line saying how many qualified, because three lines
 * saying "Ur +2" would bury the ledger. A city-scoped `countScaled` is summed
 * across the empire's towns for the same reason.
 *
 * **This function must never read a meter.** It is called *by* `explainHappiness`,
 * and a card line that asked how happy the empire was would be the recursion the
 * module docblock cuts one level up.
 *
 * **A city's own live rites are not folded here, and that is a stated absence.**
 * This reader is empire-scoped by construction — it sweeps the realm's towns
 * itself rather than being handed one — so it walks `liveEffects` where every
 * city-scoped reader walks `liveCityEffects` (Entry XXVIII). Nothing in the rite
 * table pays happiness today; **Funeral Rites** is the row that will, and it is
 * deferred to The High Temple. The fix when it lands is this loop asking each
 * admitted town for its own effects rather than the empire's, which is a change
 * to *where the list comes from* and not to the arithmetic.
 */
export function cardHappiness(state: GameState, playerId: number): CardMeterLine[] {
  const list: CardMeterLine[] = [];

  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'happiness')) {
    const each = scaleByLevel(effect.amount, level);
    if (each === 0) continue;
    if (effect.per !== 'city') {
      if (effect.scope !== undefined) continue;
      list.push({ card, source, amount: each });
      continue;
    }
    let towns = 0;
    for (const city of state.cities) {
      if (city.ownerId !== playerId) continue;
      if (cityScopeAdmits(state, city, effect.scope)) towns += 1;
    }
    if (towns === 0) continue;
    list.push({ card, source: label(source, `${towns} cities`), amount: each * towns });
  }

  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'countScaled')) {
    if (effect.pays.to !== 'happiness') continue;
    const each = scaleByLevel(effect.pays.amount, level);
    if (each === 0) continue;
    let times = 0;
    // A count that is city-scoped is summed over the empire's towns; an
    // empire-scale one is asked once. `countOf` answers 0 for a city count with
    // no city, so the branch is about *which question*, not about a guard.
    if (isCityScopedCount(effect)) {
      for (const city of state.cities) {
        if (city.ownerId !== playerId) continue;
        times += helpings(countOf(state, playerId, effect, city), effect.per, effect.max);
      }
    } else {
      times = helpings(countOf(state, playerId, effect), effect.per, effect.max);
    }
    if (times === 0) continue;
    list.push({ card, source: label(source, `×${times}`), amount: each * times });
  }

  return list;
}

/**
 * The authority capacity this empire's cards supply.
 *
 * Capacity, never a discount on what a city costs — `resourceAuthority`'s rule,
 * and the reason a card that wants cities *cheaper* says so with a `meterRule`
 * instead. The two halves of the meter go on meaning what they meant.
 */
export function cardAuthority(state: GameState, playerId: number): CardMeterLine[] {
  const list: CardMeterLine[] = [];

  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'authority')) {
    const each = scaleByLevel(effect.amount, level);
    if (each === 0) continue;
    const towns = effect.per === 'city' ? cityCount(state, playerId) : 1;
    if (towns === 0) continue;
    list.push({
      card,
      source: effect.per === 'city' ? label(source, `${towns} cities`) : source,
      amount: each * towns,
    });
  }

  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'countScaled')) {
    if (effect.pays.to !== 'authority') continue;
    const each = scaleByLevel(effect.pays.amount, level);
    if (each === 0) continue;
    const times = helpings(countOf(state, playerId, effect), effect.per, effect.max);
    if (times === 0) continue;
    list.push({ card, source: label(source, `×${times}`), amount: each * times });
  }

  return list;
}

/** The percentage points this empire's cards add to the positive happiness rungs. */
export function cardTierBoost(state: GameState, playerId: number): {
  lines: CardMeterLine[];
  points: number;
} {
  const lines: CardMeterLine[] = [];
  let points = 0;
  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'happinessTierBoost')) {
    const amount = scaleByLevel(effect.points, level);
    if (amount === 0) continue;
    points += amount;
    lines.push({ card, source: label(source, 'contentment'), amount });
  }
  return { lines, points };
}

/**
 * What a card says about one constant of the two meters, or `null` when no card
 * says anything.
 *
 * `value` replaces and `delta` shifts, and a rule that gets both takes the
 * replacement first and then every shift — which is the only reading under which
 * Hegemony ("captured cities cost 2") and a future "+1 to every city's cost"
 * compose into something a player can predict.
 */
export function cardMeterRule(
  state: GameState,
  playerId: number,
  rule: MeterRuleId,
  base: number,
): number {
  let value = base;
  let replaced = false;
  for (const { level, effect } of effectsOfKind(state, playerId, 'meterRule')) {
    if (effect.rule !== rule) continue;
    if (effect.value !== undefined && !replaced) {
      value = scaleByLevel(effect.value, level);
      replaced = true;
    }
  }
  for (const { level, effect } of effectsOfKind(state, playerId, 'meterRule')) {
    if (effect.rule !== rule || effect.delta === undefined) continue;
    value += scaleByLevel(effect.delta, level);
  }
  return value;
}

/** Is a meter rule declared at all? The reading for a flag-shaped rule. */
export function cardMeterFlag(state: GameState, playerId: number, rule: MeterRuleId): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'meterRule')) {
    if (effect.rule === rule) return true;
  }
  return false;
}

// --- combat -----------------------------------------------------------------

/** Everything a strength line needs to know about the fight it is asked about. */
export interface CombatSituation {
  /** The unit whose owner's cards are being asked about. */
  unit: Unit;
  /** Which posture this side is in. */
  side: 'attack' | 'defend';
  /** The contested hex — where the defender stands. */
  tile: Tile;
  /** True when the other side is the wild. */
  vsBarbarians: boolean;
  /** True when the target is a city. */
  vsCity: boolean;
  /** The defender's hit points and maximum, for `targetBelowHalf`. */
  targetHp: number;
  targetMaxHp: number;
}

/** Does a combat condition hold for this situation? One evaluator. */
function combatConditionHolds(
  state: GameState,
  situation: CombatSituation,
  when: CombatCondition,
): boolean {
  const test = when.test;
  switch (test) {
    case 'always':
      return true;
    case 'vsBarbarians':
      return situation.vsBarbarians;
    case 'ownTerritory':
      return tileOwnerPlayerId(state, situation.tile.col, situation.tile.row) === situation.unit.ownerId;
    case 'foreignTerritory':
      return tileOwnerPlayerId(state, situation.tile.col, situation.tile.row) !== situation.unit.ownerId;
    case 'onHills':
      return situation.tile.hills;
    case 'vsCity':
      return situation.vsCity;
    case 'targetBelowHalf':
      return situation.targetMaxHp > 0 && situation.targetHp * 2 < situation.targetMaxHp;
    case 'capitalTerritory': {
      // `ownTerritory` narrowed to the capital's own borders, asked by tile id
      // rather than by owner so that a second city standing beside the first
      // does not lend its ground to the Walls of Uruk.
      const capital = capitalCityOf(state, situation.unit.ownerId);
      if (!capital) return false;
      return tileOwnerCityId(state, situation.tile.col, situation.tile.row) === capital.id;
    }
    case 'inCity': {
      // A town of this unit's own empire stands on the contested hex. Paired
      // with `side: 'defend'` on every row that wants it — see the condition.
      const here = cityAt(state, situation.tile.col, situation.tile.row);
      return here !== undefined && here.ownerId === situation.unit.ownerId;
    }
    default: {
      const unhandled: never = test;
      void unhandled;
      return false;
    }
  }
}

/** How many friendly combat units stand next to this one. */
function adjacentFriendlies(state: GameState, unit: Unit): number {
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return 0;
  let count = 0;
  for (const neighbour of neighborTiles(state.map, tileHex(from))) {
    for (const other of state.units) {
      if (other.id === unit.id) continue;
      if (other.ownerId !== unit.ownerId) continue;
      if (other.col !== neighbour.col || other.row !== neighbour.row) continue;
      if (!isCombatant(unitDef(other.type))) continue;
      count += 1;
    }
  }
  return count;
}

/** One strength line a card contributes, as `planCombat` needs it. */
export interface CardCombatLine {
  card: CardId;
  source: string;
  amount: number;
}

/**
 * Every flat strength this empire's cards give one side of one fight.
 *
 * The generalisation of `combat.ts`'s own "+2 vs barbarians": that line is a
 * `CombatBonusLine` with a label and a side, and so is every one of these —
 * `planCombat` pushes them into the list it already had, they are counted into
 * the two strengths, and the forecast card itemises them. A card that only ever
 * mattered in the reducer would be a card the player could not plan around.
 *
 * **Flat, and after the terrain multiplier**, exactly as the wild's tax is: a
 * fact about the opponent or the posture must not scale with the ground (see
 * `CombatBonusLine`).
 */
export function cardCombatLines(state: GameState, situation: CombatSituation): CardCombatLine[] {
  const owner = situation.unit.ownerId;
  const list: CardCombatLine[] = [];
  for (const { source, card, level, effect } of pickKind(liveUnitEffects(state, situation.unit), 'combatLine')) {
    if (effect.side !== 'both' && effect.side !== situation.side) continue;
    // Which units the line reaches, asked of the same predicate `unitStat` asks
    // — the Alhambra's mounted +2. Of *this* piece, whichever side it is on, so
    // a line that pays both postures pays a knight in either.
    if (!unitMatches(situation.unit.type, effect.class)) continue;
    if (!combatConditionHolds(state, situation, effect.when)) continue;
    const each = scaleByLevel(effect.amount, level);
    if (each === 0) continue;
    if (!effect.scaled) {
      list.push({ card, source, amount: each });
      continue;
    }
    const total =
      effect.scaled.count === 'cities'
        ? cityCount(state, owner)
        : adjacentFriendlies(state, situation.unit);
    let amount = each * helpings(total, effect.scaled.per, undefined);
    if (effect.scaled.max !== undefined) {
      amount = Math.sign(amount) * Math.min(Math.abs(amount), scaleByLevel(effect.scaled.max, level));
    }
    if (amount === 0) continue;
    list.push({ card, source, amount });
  }
  return list;
}

/**
 * The percentage this empire's cards put on a unit's own strength, as one whole
 * signed figure.
 *
 * Master of Maps' drawback, and the one place a card multiplies a *strength*
 * rather than adding to it. It applies to the unit's base before any flat line
 * joins, so "−10% combat strength" is a fact about the army and not a discount
 * on the terrain bonus somebody else earned.
 */
export function cardCombatPercent(state: GameState, unit: Unit): number {
  let percent = 0;
  for (const { level, effect } of effectsOfKind(state, unit.ownerId, 'unitStat')) {
    if (effect.stat !== 'combatPercent') continue;
    if (!unitMatches(unit.type, effect.class)) continue;
    percent += scaleByLevel(effect.amount, level);
  }
  return percent;
}

// --- unit and city stats ----------------------------------------------------

/** Does this unit type pass a filter? Absent filter admits everything. */
function unitMatches(type: UnitTypeId, filter?: UnitFilter): boolean {
  if (!filter) return true;
  const def = unitDef(type);
  if (filter.modelClass !== undefined && def.modelClass !== (filter.modelClass as ModelClass)) {
    return false;
  }
  if (filter.category !== undefined && def.category !== filter.category) return false;
  if (filter.ranged !== undefined && (def.range !== undefined) !== filter.ranged) return false;
  // "Religious units", asked of the roster's own marker. Absent on every type
  // that digs, so `=== true` is the reading and `false` means "the ones that
  // do not pray" — which is how the Pyramids reach the worker without reaching
  // the augur standing beside it in the same `modelClass`.
  if (filter.consecrates !== undefined && (def.consecrates === true) !== filter.consecrates) {
    return false;
  }
  return true;
}

/**
 * What this empire's cards add to one stat of one unit.
 *
 * Read through each stat's **single** evaluator, which is the promise this hook
 * makes: `fullMovement` is the only place a movement allowance is decided,
 * `sightOf` the only place a sight radius is, `healUnits` the only place a heal
 * is, and each of them adds this and nothing else. A card that wrote a unit's
 * movement into the unit would be a second answer that a save could disagree
 * with.
 *
 * `where: 'ownTerritory'` is asked of the hex the unit is standing on, which is
 * the only reading a per-turn allowance can have: Imperium's legions march
 * further because they set out from home.
 */
export function cardUnitStat(
  state: GameState,
  unit: Unit,
  stat: 'movement' | 'sight' | 'heal' | 'range',
): number {
  let total = 0;
  for (const { level, effect } of effectsOfKind(state, unit.ownerId, 'unitStat')) {
    if (effect.stat !== stat) continue;
    if (!unitMatches(unit.type, effect.class)) continue;
    if (effect.where === 'ownTerritory') {
      if (tileOwnerPlayerId(state, unit.col, unit.row) !== unit.ownerId) continue;
    }
    if (effect.where === 'embarked') {
      // On water is embarked: nothing else can be standing there, because
      // embarkation is the only way a piece reaches a water hex at all.
      const here = getTileAt(state.map, unit.col, unit.row);
      if (!here || !isWaterTerrain(here.terrain)) continue;
    }
    total += scaleByLevel(effect.amount, level);
  }
  return total;
}

/**
 * Extra charges a unit of this type is **born** with — read by `createUnit`,
 * once, at the moment of the birth.
 *
 * At birth rather than on read, and that is the rule the card's text states:
 * "workers are built with +1 charge". A charge is spent, so a bonus computed on
 * read would give a worker its extra charge back every time the card was
 * re-slotted, and take it away mid-job when the card came out.
 */
export function cardExtraCharges(state: GameState, playerId: number, type: UnitTypeId): number {
  let total = 0;
  for (const { level, effect } of effectsOfKind(state, playerId, 'unitStat')) {
    if (effect.stat !== 'charges') continue;
    if (!unitMatches(type, effect.class)) continue;
    total += scaleByLevel(effect.amount, level);
  }
  return total;
}

/** One line of what a card adds to a city's own defence or sight. */
export interface CardCityStatLine {
  card: CardId;
  source: string;
  amount: number;
}

/**
 * What this empire's cards add to one stat of one **city**.
 *
 * A list rather than a number, because a city's defence is quoted in a combat
 * forecast and a forecast that said "+11" with no reason would be the one thing
 * rule 5 forbids. `planCombat` folds it into the defender's strength and prints
 * the lines beside the walls.
 */
export function cardCityStat(
  state: GameState,
  city: City,
  stat: 'defense' | 'sight',
): CardCityStatLine[] {
  const list: CardCityStatLine[] = [];
  for (const { source, card, level, effect } of cityEffectsOfKind(state, city, 'cityStat')) {
    if (effect.stat !== stat) continue;
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    const amount = scaleByLevel(effect.amount, level);
    if (amount === 0) continue;
    list.push({ card, source: label(source, scopeNote(effect.scope)), amount });
  }
  return list;
}

/** The fold of a city-stat list. The only sum of one. */
export function foldCityStat(list: readonly CardCityStatLine[]): number {
  let total = 0;
  for (const line of list) total += line.amount;
  return total;
}

// --- windfalls --------------------------------------------------------------

/**
 * What a windfall actually pays once its riders are on it.
 *
 * **A rider is part of the printed number.** Entry XVIII.5 says a one-time grant
 * pays its printed figure exactly — no city percentages, no meter tiers, no
 * Entry XVII staging — and that is unchanged: a rider does not multiply the
 * settlement afterwards, it *changes what is printed before anything is banked*.
 * A 20⚙ chop under The Woodwrights is a 40⚙ windfall, and 40 is what the
 * preview promises, what the basket receives and what the announcement says.
 * This function is the one place the composition happens, so there is exactly
 * one number and no path around it.
 *
 * Riders on one occasion **sum** their percentages before multiplying once —
 * Entry XVII's "additive within a stage" read at a different scale, and the only
 * reading under which two +100% riders are worth +200% rather than ×4.
 */
export interface WindfallPayout {
  /** The occasion's own figure with every percentage rider folded in. */
  amount: number;
  /** Extra voices the riders add outright, keyed by yield. */
  grants: { card: CardId; source: string; yield: CityYieldKey; amount: number }[];
  /** Hit points a rider restores to the acting unit. */
  heal: number;
  /** Every rider that touched this payout, for the announcement. */
  lines: { card: CardId; source: string; note: string }[];
}

/**
 * Composes the printed number for one occasion. `base` is what the occasion
 * pays with no cards at all; pass 0 for an occasion that has no figure of its
 * own (a death, a kill, a capture) and read the grants.
 */
export function windfallPayout(
  state: GameState,
  playerId: number,
  occasion: WindfallOccasion,
  base = 0,
): WindfallPayout {
  const payout: WindfallPayout = { amount: base, grants: [], heal: 0, lines: [] };
  let percent = 0;
  // The era multiplier (Entry XXVIII). **One** factor however many riders ask
  // for it, which is Entry XVII's "additive within a stage, applied once" read
  // at this scale: two cards that each say "×your era" agree rather than
  // compounding into ×era². Computed before the walk so a rider's own grant can
  // use the same figure the occasion's payout does.
  const era = highestAge(playerById(state, playerId)?.techsResearched ?? []);
  // The slotted-Order multiplier (War Chief). `perAge`'s sibling and hoisted
  // beside it for the same reason: **one** factor however many riders ask for
  // it, and computed before the walk so a rider's own grant multiplies by the
  // same count the occasion's figure does. Zero is a real answer — an empire
  // with an empty council rides no harder — and it makes every figure on this
  // payout zero, which drops the lines rather than printing noughts.
  const slotted = filledOrderSlots(state, playerId);
  let ageMultiplied = false;
  let slotMultiplied = false;
  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'windfallRider')) {
    if (effect.occasion !== occasion) continue;
    if (effect.perAge === true) {
      ageMultiplied = true;
      if (era > 1) payout.lines.push({ card, source, note: `×${era} (Æra ${'I'.repeat(era)})` });
    }
    if (effect.perSlottedOrder === true) {
      slotMultiplied = true;
      // Noted only when it *changes* the figure, which is `perAge`'s rule for
      // Æra I exactly: a ×1 is not news, and a ×0 has already deleted every
      // line it would have annotated.
      const orders = slotted === 1 ? 'Order' : 'Orders';
      if (slotted > 1) payout.lines.push({ card, source, note: `×${slotted} (slotted ${orders})` });
    }
    if (effect.percent !== undefined) {
      const share = scaleByLevel(effect.percent, level);
      if (share !== 0) {
        percent += share;
        payout.lines.push({ card, source, note: `${share > 0 ? '+' : ''}${share}%` });
      }
    }
    const grant = effect.grant;
    if (!grant) continue;
    if (grant.heal !== undefined) {
      const heal = scaleByLevel(grant.heal, level);
      if (heal !== 0) {
        payout.heal += heal;
        payout.lines.push({ card, source, note: `heals ${heal}` });
      }
    }
    if (grant.yield !== undefined && grant.amount !== undefined) {
      // A rider's own grant is multiplied by the era when *that rider* says so —
      // Rites of Blood pays fifteen faith a kill in Æra I and forty-five in Æra
      // III — which is a fact about the card and not about the occasion. The
      // slotted-Order count multiplies the same way and the two **compose as a
      // product**: a rider carrying both is ×era × slots, because they are two
      // independent facts about the payout rather than two competing scalings of
      // one.
      const amount =
        scaleByLevel(grant.amount, level) *
        (effect.perAge === true ? era : 1) *
        (effect.perSlottedOrder === true ? slotted : 1);
      if (amount !== 0) {
        payout.grants.push({ card, source, yield: grant.yield, amount });
        payout.lines.push({ card, source, note: `+${amount} ${grant.yield}` });
      }
    }
  }
  // Summed, then applied once — see the docblock. Floored, because a windfall is
  // a whole number all the way down. The era multiplies **last**, on the figure
  // the percentages already reached, so "×your era" is a fact about the money
  // rather than a competitor to the percentages.
  if (percent !== 0 && base !== 0) payout.amount = Math.floor((base * (100 + percent)) / 100);
  if (ageMultiplied) payout.amount *= era;
  if (slotMultiplied) payout.amount *= slotted;
  return payout;
}

/**
 * How many of this empire's Order slots are **filled**.
 *
 * The non-null entries of `PlayerStatecraft.slots` — held-but-unslotted Orders
 * deliberately do not count, because slotting is the decision the government's
 * spread makes scarce and a card that pays for it has to pay for *that*. A
 * derived count and never a stored one, for `barbarianRoles`' reason: a number
 * on the player would have to be maintained by every path that slots, unslots,
 * or rebuilds the spread on adoption, and one missed path is a silent
 * miscount.
 */
export function filledOrderSlots(state: GameState, playerId: number): number {
  const sc = statecraftOf(state, playerId);
  if (!sc) return 0;
  let count = 0;
  for (const slot of sc.slots) {
    if (slot) count += 1;
  }
  return count;
}

/**
 * The cadenced drafts this empire's cards open — Keeper of the Calendar's, and
 * nothing else today.
 *
 * A reader like every other, so the *phase* that opens the offer
 * (`openPeriodicOffers` in `religion.ts`) never touches a `CardEffect`. Which is
 * the point: the one-evaluator rule is not "religion has its own evaluator", it
 * is that this file is still the only file that knows what a `periodicOffer`
 * looks like.
 */
export function cardPeriodicOffers(
  state: GameState,
  playerId: number,
): { source: string; every: number; site: 'ruins' | 'village' }[] {
  const list: { source: string; every: number; site: 'ruins' | 'village' }[] = [];
  for (const { source, effect } of effectsOfKind(state, playerId, 'periodicOffer')) {
    if (effect.every <= 0) continue;
    list.push({ source, every: Math.floor(effect.every), site: effect.site });
  }
  return list;
}

/**
 * Pays a windfall's *grants* — the voices a rider adds outright — into the
 * empire's banks and the nearest city's baskets.
 *
 * `at` is where the occasion happened, which is what resolves "its nearest
 * city": the same `nearestOwnedCity` a discovery uses, so a Widow's Levy and a
 * grain cache name the same town. Returns which cities were touched, so the
 * caller can settle them (the windfall settlement register in CLAUDE.md).
 */
export function payWindfallGrants(
  state: GameState,
  player: Player,
  payout: WindfallPayout,
  at?: { col: number; row: number },
): City[] {
  const touched: City[] = [];
  for (const grant of payout.grants) {
    if (grant.yield === 'gold') player.gold += grant.amount;
    else if (grant.yield === 'science') player.sciencePool += grant.amount;
    else if (grant.yield === 'culture') player.culturePool += grant.amount;
    else if (grant.yield === 'faith') player.faithPool += grant.amount;
    else {
      const city = at ? nearestOwnedCity(state, player.id, at) : capitalCityOf(state, player.id) ?? null;
      if (!city) continue;
      if (grant.yield === 'food') city.foodBasket += grant.amount;
      else city.hammerBasket += grant.amount;
      if (!touched.includes(city)) touched.push(city);
    }
  }
  return touched;
}

// --- the flag-shaped hooks --------------------------------------------------

/** Does this empire hold a card declaring this action rule? */
export function cardActionRule(state: GameState, playerId: number, rule: ActionRuleId): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'actionRule')) {
    if (effect.rule === rule) return true;
  }
  return false;
}

/** Does this empire hold a card declaring this behaviour rule? */
export function cardBehaviorRule(
  state: GameState,
  playerId: number,
  rule: BehaviorRuleId,
): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'behaviorRule')) {
    if (effect.rule === rule) return true;
  }
  return false;
}

/** Does this empire hold a card declaring this offer rule? */
export function cardOfferRule(state: GameState, playerId: number, rule: OfferRuleId): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'offerRider')) {
    if (effect.rule === rule) return true;
  }
  return false;
}

/**
 * One line of what a card takes off a purchase price. See `CardPurchaseRiderEffect`.
 */
export interface CardPurchaseLine {
  card: CardId;
  source: string;
  percent: number;
}

/**
 * Every purchase rider this empire's cards put on **one unit type** — the
 * ordered lines `explainPurchaseCost` folds into its bank.
 *
 * A list rather than a number for rule 5's reason at the scale of a price tag:
 * the Religion screen prints the augur's price line by line, and a quarter off
 * with no name beside it is exactly the silence a breakdown exists to prevent.
 * The caller sums them and multiplies **once** — two riders on one purchase are
 * additive, as everything else in this game that stacks is.
 */
export function cardPurchaseRiders(
  state: GameState,
  playerId: number,
  type: UnitTypeId,
): CardPurchaseLine[] {
  const list: CardPurchaseLine[] = [];
  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'purchaseRider')) {
    if (!unitMatches(type, effect.class)) continue;
    const percent = scaleByLevel(effect.percent, level);
    if (percent === 0) continue;
    list.push({ card, source, percent });
  }
  return list;
}

/**
 * How many extra belief slots this empire's cards open — Stonehenge's one, and
 * Djenné's.
 *
 * A number rather than a list, because the consumer is a *count* and not a
 * ledger: `pantheonSlots` (`religion.ts`) is "how many gods may I hold", and
 * every reading of it — the consecration screen, `hasOpenBeliefSlot`, the offer
 * — folds the technologies' slots and these in one place.
 */
export function cardPantheonSlots(state: GameState, playerId: number): number {
  let total = 0;
  for (const { level, effect } of effectsOfKind(state, playerId, 'pantheonSlots')) {
    total += scaleByLevel(effect.amount, level);
  }
  return total;
}

/**
 * Does this empire's law make its **borders** exert a zone of control?
 *
 * The Great Wall's one clause, asked of an empire rather than of a hex, so
 * `zocField` resolves it once per sweep beside the units and the cities it
 * already walks. See `zocRule`.
 */
export function cardBorderZoc(state: GameState, playerId: number): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'zocRule')) {
    if (effect.rule === 'borders') return true;
  }
  return false;
}

/**
 * What this empire's cards add to one turn of one **project's** payout, summed
 * per voice — the Water Clock of Su Song's beakers on Scholarship.
 *
 * A bag rather than a list, because the consumer banks it into three pools and
 * there is no breakdown to print: the panel quotes a project's *rate*, and the
 * rate a rider changes is the rate the panel should quote (`projectRate` reads
 * this through `projectPays`). A flat addition to what comes out, never to the
 * hammers going in — see the shape's docblock for why that keeps Entry XXVI's
 * argument closed.
 */
export function cardProjectPays(
  state: GameState,
  playerId: number,
  project: ProjectId,
): ProjectPayout {
  const bag: ProjectPayout = {};
  for (const { level, effect } of effectsOfKind(state, playerId, 'projectRider')) {
    if (effect.project !== project) continue;
    for (const key of ['gold', 'science', 'faith'] as const) {
      const amount = scaleByLevel(effect.pays[key] ?? 0, level);
      if (amount !== 0) bag[key] = (bag[key] ?? 0) + amount;
    }
  }
  return bag;
}

/** One card's standing renown, as `explainRenown` prints it. See `cardRenownLines`. */
export interface CardRenownLine {
  card: CardId;
  source: string;
  family: Family | null;
  amount: number;
}

/**
 * Every card paying this empire renown **per turn** — the Council of Elders'
 * standing, and whatever else joins it.
 *
 * A *list*, for rule 5's reason at the scale of a count: `explainRenown`
 * (`renown.ts`) is the ordered ledger the HUD's hover prints verbatim, and a
 * government quietly adding three to a total nobody itemised is exactly the
 * silence that ledger exists to prevent. So this reader hands back lines and the
 * bucket's fold stays the only sum.
 *
 * The arithmetic is **printed into the source**, not left for the reader to do:
 * "in every city" is one line whose label says *how* it reached its figure
 * ("Government · Council of Elders · 1 per city × 3"), because a player checking
 * a hover against the ledger needs the multiplicand and the count, and three
 * identical one-renown lines would give them neither.
 *
 * A zero pays no line at all — an empire with no cities holds no counsel worth
 * recording — which is the same rule every other list in this file follows.
 */
export function cardRenownLines(state: GameState, playerId: number): CardRenownLine[] {
  const list: CardRenownLine[] = [];
  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'renown')) {
    const each = scaleByLevel(effect.amount, level);
    if (each === 0) continue;
    const helpings = effect.per === 'city' ? cityCount(state, playerId) : 1;
    const amount = each * helpings;
    if (amount === 0) continue;
    list.push({
      card,
      source: effect.per === 'city' ? `${source} · ${each} per city × ${helpings}` : source,
      family: effect.family ?? null,
      amount,
    });
  }
  return list;
}

/**
 * What an amplifier does to somebody else's number, as a whole signed percent.
 *
 * The Grand Bazaar's shape and the one hook that reaches *into* another
 * vocabulary: the flat happiness every luxury pays, what a duplicate copy is
 * worth, and — since the wonders pass — how long a blessing runs. The other
 * table goes on saying what it says; this scales the reading.
 */
export function cardAmplifier(
  state: GameState,
  playerId: number,
  target: AmplifierTarget,
): number {
  let percent = 0;
  for (const { level, effect } of effectsOfKind(state, playerId, 'effectAmplifier')) {
    if (effect.target !== target) continue;
    percent += scaleByLevel(effect.percent, level);
  }
  return percent;
}

/** What a newly founded city of this empire is founded with. */
export interface FoundingRider {
  /** Extra population beyond the first. */
  population: number;
  /** Buildings it opens with, in walk order. */
  buildings: BuildingId[];
}

/**
 * The founding rider for this empire's **next** city.
 *
 * `maxCities` is counted against cities the player currently holds, which is the
 * reading The Founders' Road's text asks for ("your first 5 cities") and the
 * only one that does not need a counter on the player: the fifth city is founded
 * while four stand, and a sixth is not.
 */
export function cardFoundingRider(state: GameState, playerId: number): FoundingRider {
  const rider: FoundingRider = { population: 0, buildings: [] };
  const held = cityCount(state, playerId);
  for (const { level, effect } of effectsOfKind(state, playerId, 'foundingRider')) {
    if (effect.maxCities !== undefined && held >= effect.maxCities) continue;
    if (effect.population !== undefined) rider.population += scaleByLevel(effect.population, level);
    if (effect.building !== undefined && !rider.buildings.includes(effect.building)) {
      rider.buildings.push(effect.building);
    }
  }
  return rider;
}

/**
 * How long slotting an Order seals it, for this empire.
 *
 * The `metaRule` hook's one consumer — a card that rewrites a rule of Statecraft
 * itself (Entry XV.b). The *lowest* value wins when more than one card speaks,
 * because The Loose Rein's promise is "seals last 2 turns" and a second card
 * saying 3 must not make it worse.
 */
export function sealTurnsFor(state: GameState, playerId: number): number {
  let turns = METER.sealTurns;
  for (const { level, effect } of effectsOfKind(state, playerId, 'metaRule')) {
    if (effect.rule !== 'sealTurns') continue;
    turns = Math.min(turns, Math.max(0, scaleByLevel(effect.value, level)));
  }
  return turns;
}

// --- words ------------------------------------------------------------------

/** One clause of a card, in words, for the screen and the offer cards. */
export interface CardClause {
  text: string;
  /** True for a clause this build does not implement. Printed struck through. */
  deferred?: boolean;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** A yield bag in words: "+2 gold, +1 culture". */
function bagWords(bag: Partial<Record<CityYieldKey, number>>, level: number): string {
  const parts: string[] = [];
  for (const key of VOICES) {
    const value = scaleByLevel(bag[key] ?? 0, level);
    if (value === 0) continue;
    parts.push(`${signed(value)} ${key}`);
  }
  return parts.join(', ');
}

/**
 * One card's effects in words, at a given level.
 *
 * Here rather than in the interface because it is a reading of the vocabulary,
 * and the vocabulary is read in one file (`describeResourceSignature`'s
 * argument). Every text surface that names a card — the offer, the collection,
 * the slot hover — calls this, so they cannot describe the same card two ways,
 * and an **upgraded** face reads as its scaled numbers everywhere for the same
 * reason.
 */
export function describeCard(id: CardId, level = 1): CardClause[] {
  const def: CardDefBase = anyCardDef(id);
  const clauses: CardClause[] = [];
  for (const effect of def.effects) describeEffect(effect, level, clauses);
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
  for (const missing of def.deferred ?? []) {
    clauses.push({ text: `${missing} — not built yet`, deferred: true });
  }
  return clauses;
}

/** The one place an effect becomes a sentence. Every arm, no default silence. */
function describeEffect(effect: CardEffect, level: number, out: CardClause[]): void {
  const kind = effect.kind;
  switch (kind) {
    case 'cityYields': {
      const words = bagWords(effect, level);
      if (words) out.push({ text: `${words} in ${scopeWords(effect.scope)}` });
      return;
    }
    case 'empireYields': {
      const words = bagWords(effect, level);
      if (words) out.push({ text: `${words} to the empire` });
      return;
    }
    case 'tileYield': {
      const words = bagWords(effect, level);
      // The scope trails the hex as a clause of its own, because a scoped tile
      // line is about *whose* ground: Petra's desert is the desert of one town,
      // and the sentence has to say so without turning the hex into a
      // possessive nobody can parse.
      const whose = effect.scope === undefined ? '' : `, in ${scopeWords(effect.scope)}`;
      if (words) out.push({ text: `${words} on every ${tileConditionWords(effect.on)}${whose}` });
      return;
    }
    case 'percentYields': {
      const voice = effect.yield === 'all' ? 'all yields' : effect.yield;
      out.push({
        text: `${signed(scaleByLevel(effect.percent, level))}% ${voice} in ${scopeWords(effect.scope)}`,
      });
      return;
    }
    case 'productionBonus': {
      const what = effect.modelClass ? `${effect.modelClass} units` : `${effect.category}s`;
      out.push({
        text: `${signed(scaleByLevel(effect.percent, level))}% production toward ${what}`,
      });
      return;
    }
    case 'rulePercent':
      out.push({
        text: `${signed(scaleByLevel(effect.percent, level))}% ${RULE_WORDS[effect.rule]}`,
      });
      return;
    case 'happiness':
      out.push({
        text:
          `${signed(scaleByLevel(effect.amount, level))} happiness` +
          (effect.per === 'city' ? ` in ${scopeWords(effect.scope)}` : ''),
      });
      return;
    case 'authority':
      out.push({
        text:
          `${signed(scaleByLevel(effect.amount, level))} authority capacity` +
          (effect.per === 'city' ? ' per city' : ''),
      });
      return;
    case 'happinessTierBoost':
      out.push({
        text: `${signed(scaleByLevel(effect.points, level))} percentage points when content`,
      });
      return;
    case 'combatLine': {
      const each = signed(scaleByLevel(effect.amount, level));
      // "per adjacent friendly combat unit", never "per 1 adjacent friendly
      // combat units": a helping of one is the thing itself, and printing the
      // 1 is what made The Marshals read like a rounding error.
      const scale = effect.scaled
        ? ` per ${countWords(effect.scaled.per, SCALE_WORDS[effect.scaled.count])}` +
          (effect.scaled.max === undefined ? '' : ` (at most ${signed(effect.scaled.max)})`)
        : '';
      // Who the line is for, when it is not for everybody — the Alhambra's
      // mounted +2 read as a bare "+2 combat strength" until `class` was
      // printed, which is a card that lies by omission.
      const who = effect.class === undefined ? '' : ` for ${filterWords(effect.class)}`;
      out.push({
        text: `${each} combat strength${who}${scale} ${COMBAT_WORDS[effect.when.test]}`.trim(),
      });
      return;
    }
    case 'unitStat': {
      const who = effect.class ? filterWords(effect.class) : 'all units';
      const where = WHERE_WORDS[effect.where ?? 'anywhere'];
      const amount = scaleByLevel(effect.amount, level);
      if (effect.stat === 'combatPercent') {
        out.push({ text: `${signed(amount)}% combat strength for ${who}${where}` });
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
    case 'windfallRider': {
      const occasion = OCCASION_WORDS[effect.occasion];
      // The **grant first**, then the riders on it. Rites of Blood pays fifteen
      // faith and the age multiplies it; leading with the multiplier said the
      // second half of a sentence whose first half had not been printed yet.
      const grant = effect.grant;
      // The slotted-Order count rides as a **suffix on the figure it
      // multiplies**, unlike the era, and the difference is what the two say:
      // "in the money of your era" is a whole sentence about the payout, while
      // "per slotted Order" is a *rate* and a rate read as a separate clause
      // repeats itself once per grant on the card ("a kill grants +5 science",
      // "a kill pays once per slotted Order", "a kill grants +5 culture", …).
      // War Chief carries two grants, so it would have said it twice.
      const per = effect.perSlottedOrder === true ? ' per slotted Order' : '';
      if (grant?.yield !== undefined && grant.amount !== undefined) {
        out.push({
          text: `${occasion} grants ${signed(scaleByLevel(grant.amount, level))} ${grant.yield}${per}`,
        });
      }
      if (grant?.heal !== undefined) {
        out.push({ text: `${occasion} heals ${scaleByLevel(grant.heal, level)}${per}` });
      }
      if (effect.percent !== undefined) {
        out.push({ text: `${occasion} pays ${signed(scaleByLevel(effect.percent, level))}%${per}` });
      }
      if (effect.perAge === true) {
        out.push({ text: `${occasion} pays in the money of your era` });
      }
      // A rider that multiplies only the *occasion's own* figure has no clause
      // to hang the suffix on, so it gets the sentence instead. Nothing on the
      // table reads this way today; it is here so the shape cannot ship silent.
      if (per !== '' && grant === undefined && effect.percent === undefined) {
        out.push({ text: `${occasion} pays once over per slotted Order` });
      }
      return;
    }
    case 'foundingRider': {
      const limit = effect.maxCities === undefined ? '' : ` (first ${effect.maxCities} cities)`;
      if (effect.population !== undefined) {
        out.push({
          text: `new cities start ${scaleByLevel(effect.population, level)} population larger${limit}`,
        });
      }
      if (effect.building !== undefined) {
        // The building's **name**, not its id: "a monument" is a lucky accident
        // of that row's spelling, and the next founding rider's would not be.
        out.push({
          text: `new cities are founded with ${buildingWords(effect.building)}${limit}`,
        });
      }
      return;
    }
    case 'countScaled': {
      // The cap is on the **count** (`helpings` in this file), so it is printed
      // as the payout it works out to — "(at most +3 happiness)" — which is how
      // every ratified row states it and the only form a player can check
      // against the ledger. A bare "(at most 4)" beside "+2 production per …"
      // read as a cap of four production, which was wrong by half.
      const cap =
        effect.max === undefined
          ? ''
          : ` (at most ${payoutWords(effect.pays, level, effect.max)})`;
      // A count that names a building says the building's own name — "per
      // Barracks", "per Temple" — rather than a stem in the table, because one
      // shape serves every such row and a table entry could only name one of
      // them. `within` is printed where it changes the sentence's meaning.
      const words = countNoun(effect);
      const here = effect.within === 'city' && !CITY_SCOPED_COUNTS.includes(effect.count)
        ? ' in this city'
        : '';
      out.push({
        text: `${payoutWords(effect.pays, level)} per ${countWords(effect.per, words)}${here}${cap}`,
      });
      return;
    }
    case 'rateConversion': {
      out.push({
        text: `${payoutWords(effect.pays, level)} per ${countWords(
          effect.per,
          RATE_WORDS[effect.from],
        )}`,
      });
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
      const extra = scaleByLevel(effect.extra ?? 1, level);
      out.push({
        text: `+${extra} ${extra === 1 ? 'card' : 'cards'} in ${OFFER_DRAFT_WORDS[effect.offer]}`,
      });
      return;
    }
    case 'effectAmplifier':
      out.push({ text: AMPLIFIER_WORDS[effect.target](scaleByLevel(effect.percent, level)) });
      return;
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
      out.push({
        text:
          effect.value !== undefined
            ? `${words} is ${effect.value}`
            : `${words} ${signed(effect.delta ?? 0)}`,
      });
      return;
    }
    case 'conditionRule': {
      const inner: CardClause[] = [];
      for (const nested of effect.then) describeEffect(nested, level, inner);
      out.push({
        text: `${CONDITION_WORDS[effect.when.test]}${conditionValue(effect.when)}: ${inner
          .map((clause) => clause.text)
          .join('; ')}`,
      });
      return;
    }
    case 'actionRule':
      out.push({ text: ACTION_WORDS[effect.rule] });
      return;
    case 'behaviorRule':
      out.push({ text: BEHAVIOR_WORDS[effect.rule] });
      return;
    case 'cityStat':
      out.push({
        text: `${scopeWords(effect.scope)}: ${signed(scaleByLevel(effect.amount, level))} ${
          effect.stat === 'defense' ? 'city defence' : 'city sight'
        }`,
      });
      return;
    case 'metaRule':
      out.push({ text: `your Orders' seals last ${effect.value} turns` });
      return;
    case 'periodicOffer':
      out.push({
        text: `every ${effect.every} turns, ${
          effect.site === 'ruins' ? 'the almanac yields a find' : 'a village comes to meet you'
        }`,
      });
      return;
    case 'unlocksBuilding':
      out.push({ text: `unlocks the ${buildingDef(effect.building).name}`, deferred: true });
      return;
    case 'pantheonSlots': {
      const slots = scaleByLevel(effect.amount, level);
      out.push({ text: `${signed(slots)} pantheon ${slots === 1 || slots === -1 ? 'slot' : 'slots'}` });
      return;
    }
    case 'purchaseRider': {
      const percent = scaleByLevel(effect.percent, level);
      // "cost −25%", not "−25% cost": the sign belongs to the price, and a
      // discount read as a bonus is the one thing this line must not do.
      out.push({
        text: `${filterWords(effect.class)} cost ${percent < 0 ? '−' : '+'}${Math.abs(percent)}% to buy`,
      });
      return;
    }
    case 'zocRule':
      out.push({ text: 'every hex you own holds ground against your rivals' });
      return;
    case 'projectRider': {
      const bag = bagWords(effect.pays, level);
      if (bag) out.push({ text: `${projectDef(effect.project).name} pays ${bag}` });
      return;
    }
    case 'renown': {
      // "per turn" is load-bearing and never trimmed: every other count on a
      // card is a standing fact, and this one is a trickle. The family, where a
      // card names one, trails as its own phrase rather than modifying "renown"
      // — a player reads *what they gain* first and *whom it favours* second.
      const where = effect.per === 'city' ? ' in every city' : '';
      const family = effect.family === undefined ? '' : `, favouring ${effect.family}s`;
      out.push({
        text: `${signed(scaleByLevel(effect.amount, level))} renown per turn${where}${family}`,
      });
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
 * What a completion grant hands over, in words. See `CompletionGrant`.
 *
 * "on completion" leads every one of them, because that is the whole difference
 * between a grant and an effect: everything else on a card is true for as long
 * as the card is held, and this is true once.
 */
function grantWords(grant: CompletionGrant): string {
  if (grant.grant === 'tech') return 'on completion, the technology you are researching is finished';
  if (grant.grant === 'doctrineDraft') return 'on completion, a Doctrine draft opens';
  const what =
    grant.unit === 'bestMelee'
      ? 'the best melee unit you can build'
      : article(unitDef(grant.unit).name);
  return `on completion, ${what} joins you`;
}

function conditionValue(when: EmpireCondition): string {
  return when.test === 'cityCountAtMost' || when.test === 'cityCountAtLeast'
    ? ` ${when.value} cities`
    : '';
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
 * What a `countScaled` is counting, as a noun in both numbers.
 *
 * `COUNT_WORDS` for every count whose noun is fixed, and the *building's own
 * name* for the one count that takes an argument — so "+1 happiness per
 * Barracks" and "per Temple" are one shape, one table entry and two data rows.
 */
function countNoun(effect: CardCountScaledEffect): PluralWords {
  if (effect.count === 'buildingsOfKind' && effect.building !== undefined) {
    const name = buildingDef(effect.building).name;
    return { one: name, many: buildingPlural(name, 2) };
  }
  return COUNT_WORDS[effect.count];
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
      into.qualifiers.push('beside a mountain');
      return;
    case 'frontier':
      into.adjectives.push('frontier');
      return;
    case 'captured':
      into.adjectives.push('conquered');
      return;
    case 'capital':
      into.adjectives.push('capital');
      return;
    case 'populationAtLeast':
      into.qualifiers.push(`of ${scope.value}+`);
      return;
    case 'holding':
      into.qualifiers.push(
        `holding ${scope.resources.map((id) => resourceDef(id).name).join(' or ')}`,
      );
      return;
    case 'holdingCategory':
      into.qualifiers.push(`holding an improved ${scope.category} resource`);
      return;
    case 'hasBuilding':
      into.qualifiers.push(`with ${buildingWords(scope.building)}`);
      return;
    case 'onTerrain':
      into.adjectives.push(scope.terrain);
      return;
    case 'all':
      for (const inner of scope.of) scopePhrase(inner, into);
      return;
    default: {
      const unhandled: never = test;
      void unhandled;
      return;
    }
  }
}

/**
 * "a Granary", "an Amphitheater" — a name with the article English actually
 * takes in front of it.
 *
 * A **sound** rule and not a spelling one, which is why it is a function and not
 * a field: the table's names are ordinary English words, and the exceptions
 * English keeps for this ("a university", "an hour") are exceptions of
 * pronunciation. Nothing on this roster hits one, so the vowel test is exact
 * today; the day a row does, it earns a `plural`-style field beside its name
 * rather than a special case here — `buildingPlural`'s bargain.
 */
function article(name: string): string {
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
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
  return isWonder(id) ? name : article(name);
}

function scopeWords(scope?: CityScope): string {
  if (!scope) return 'every city';
  // The capital is a **single** town, and the one scope that does not read as
  // "every …". It is also the only one that can say "your".
  if (scope.test === 'capital') return 'your capital';
  const phrase: ScopePhrase = { adjectives: [], qualifiers: [] };
  scopePhrase(scope, phrase);
  return ['every', ...phrase.adjectives, 'city', ...phrase.qualifiers].join(' ');
}

function filterWords(filter: UnitFilter): string {
  // The religious clause is asked **first** and reads as a whole noun phrase,
  // because it is the one filter that names a *vocation* rather than a
  // silhouette: an augur is a `worker` by model, and "worker units" is exactly
  // the wrong thing to call one. The Pyramids' half of the same pair reads the
  // other way round — "workers", the ones that are not religious.
  if (filter.consecrates === true) return 'religious units';
  if (filter.consecrates === false && filter.modelClass === 'worker') return 'workers';
  if (filter.modelClass !== undefined) return `${filter.modelClass} units`;
  if (filter.ranged === true) return 'ranged units';
  if (filter.ranged === false) return 'melee units';
  if (filter.category !== undefined) return `${filter.category} units`;
  if (filter.consecrates === false) return 'units that do not pray';
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
function payoutWords(pays: CardPayout, level: number, times = 1): string {
  if (pays.to === 'yield') {
    return `${signed(scaleByLevel(pays.amount, level) * times)} ${pays.yield}`;
  }
  if (pays.to === 'happiness') {
    return `${signed(scaleByLevel(pays.amount, level) * times)} happiness`;
  }
  if (pays.to === 'authority') {
    return `${signed(scaleByLevel(pays.amount, level) * times)} authority capacity`;
  }
  return `${signed(scaleByLevel(pays.percent, level) * times)}% ${pays.yield}`;
}

/**
 * A tile condition as a noun phrase: "every mine tile carrying a luxury
 * resource", "every tundra forest tile".
 *
 * `scopeWords`' twin one scale down, and it exists for the same reason: the
 * composite used to be joined with a `+` — "every tundra tile + forest tile",
 * which reads as two tiles rather than one wooded one. Adjectives stack in
 * front of the noun, qualifiers behind it, and `all` merges both lists.
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
    case 'water':
      into.adjectives.push('water');
      return;
    case 'improvement':
      into.adjectives.push(improvementDef(on.improvement).name.toLowerCase());
      return;
    case 'terrain':
      into.adjectives.push(on.terrain);
      return;
    case 'feature':
      into.adjectives.push(on.feature);
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
        `carrying ${on.resources.map((id) => resourceDef(id).name).join(' or ')}`,
      );
      return;
    case 'freshwater':
      into.qualifiers.push('beside fresh water');
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

function tileConditionWords(on: TileCondition): string {
  const phrase: TilePhrase = { adjectives: [], qualifiers: [] };
  tilePhrase(on, phrase);
  return [...phrase.adjectives, 'tile', ...phrase.qualifiers].join(' ');
}

const RULE_WORDS: Record<CardRule, string> = {
  happinessDemand: 'happiness demanded per citizen',
  borderCost: 'culture for the next border tile',
  growthCarryover: 'of the basket kept when a city grows',
  tilePurchase: 'the price of buying a tile',
  borderCulture: 'border culture',
  settlerCost: 'the hammers a settler costs',
  growthSurplus: 'the food surplus a city banks toward growing',
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
  inCity: 'garrisoned in one of your cities',
};

const SCALE_WORDS: Record<'cities' | 'adjacentFriendlies', PluralWords> = {
  cities: { one: 'city you hold', many: 'cities you hold' },
  // `adjacentFriendlies` counts **combatants** and nothing else, so the words
  // say so: a settler standing beside a spearman is not a shield wall.
  adjacentFriendlies: {
    one: 'adjacent friendly combat unit',
    many: 'adjacent friendly combat units',
  },
};

/** Where a `unitStat` applies, in words. `'anywhere'` is the absent field. */
const WHERE_WORDS: Record<'anywhere' | 'ownTerritory' | 'embarked', string> = {
  anywhere: '',
  ownTerritory: ' inside your territory',
  embarked: ' while embarked',
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

const OCCASION_WORDS: Record<WindfallOccasion, string> = {
  chop: 'chopping',
  camp: 'clearing a camp',
  growth: 'a city growing',
  completion: 'completing anything',
  buildingCompletion: 'completing a building',
  unitCompletion: 'completing a unit',
  capture: 'capturing a city',
  discovery: 'claiming a discovery',
  death: 'losing a unit',
  kill: 'killing a unit',
  pillage: 'pillaging',
  tech: 'completing a technology',
  tilePurchase: 'buying a tile',
  rite: 'performing a rite',
};

const COUNT_WORDS: Record<CountKind, PluralWords> = {
  uniqueLuxuries: { one: 'unique luxury', many: 'unique luxuries' },
  luxuryCopies: { one: 'improved luxury copy', many: 'improved luxury copies' },
  improvedBonusResources: {
    one: 'improved bonus resource',
    many: 'improved bonus resources',
  },
  cities: { one: 'city you hold', many: 'cities you hold' },
  population: { one: 'population', many: 'population' },
  capitalPopulation: {
    one: 'population in your capital',
    many: 'population in your capital',
  },
  // `garrisonOf` keeps only combatants, and the words say so.
  garrison: { one: 'garrisoned combat unit', many: 'garrisoned combat units' },
  garrisonWatch: {
    one: 'fortification level in the garrison',
    many: 'fortification levels in the garrison',
  },
  workedHills: { one: 'worked hill tile', many: 'worked hill tiles' },
  bankedFaith: { one: 'banked faith', many: 'banked faith' },
  bankedGold: { one: 'gold in the treasury', many: 'gold in the treasury' },
  visibleCamps: { one: 'camp you can see', many: 'camps you can see' },
  chargedAugurs: {
    one: 'augur stationed here with a rite left',
    many: 'augurs stationed here with a rite left',
  },
  scienceBuildings: {
    one: 'building here that supplies science',
    many: 'buildings here that supply science',
  },
  // The named building is not in these words: `describeEffect` prints it, so
  // that "+1 happiness per Barracks" and "per Temple" are one table entry.
  buildingsOfKind: { one: 'of them', many: 'of them' },
  buildingsInCity: { one: 'building in this city', many: 'buildings in this city' },
  workedTilesInCity: { one: 'tile worked here', many: 'tiles worked here' },
};

const RATE_WORDS: Record<RateSource, PluralWords> = {
  faithPerTurn: { one: 'faith gained per turn', many: 'faith gained per turn' },
  culturePerTurn: { one: 'culture gained per turn', many: 'culture gained per turn' },
  goldPerTurn: { one: 'gold gained per turn', many: 'gold gained per turn' },
  happiness: { one: 'point of positive happiness', many: 'points of positive happiness' },
  authority: { one: 'point of positive authority', many: 'points of positive authority' },
};

const OFFER_WORDS: Record<OfferRuleId, string> = {
  discoveryClaimAll: 'every discovery pays all of its options',
};

/** What a widened draft is *called*, on the card that widens it. */
const OFFER_DRAFT_WORDS: Record<OfferRiderScope, string> = {
  order: 'every Statecraft draft',
  doctrine: 'every doctrine draft',
  belief: 'every consecration',
  discovery: 'every discovery',
  greatPerson: 'every great-person offer',
  all: 'every draft of every kind',
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
  riteDuration: (percent) => `blessings last ${signed(percent)}% longer`,
};

const METER_RULE_WORDS: Record<MeterRuleId, string> = {
  capturedCityCost: 'the authority a captured city costs',
  coastalCityCost: 'the authority a coastal city costs',
  cityHappinessDemand: 'the happiness every city demands',
  borderFreezeExempt: 'your borders keep growing',
  authorityUnitProductionExempt: 'a torn writ no longer slows production toward units',
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

const ACTION_WORDS: Record<ActionRuleId, string> = {
  freeChop: 'chopping costs no worker charge',
  doubleOverflow: 'production overflow is doubled',
  unitJumpsQueue: 'a unit completes ahead of a building it can outpace',
  noSettlerEscalation: 'settlers never get dearer',
};

const BEHAVIOR_WORDS: Record<BehaviorRuleId, string> = {
  barbariansPassive: 'barbarians never attack you',
};

const CONDITION_WORDS: Record<EmpireCondition['test'], string> = {
  cityCountAtMost: 'while you hold at most',
  cityCountAtLeast: 'while you hold at least',
  authorityNegative: 'while your writ is torn',
  happinessNegative: 'while your people are unhappy',
};

// --- the ladder -------------------------------------------------------------

/**
 * What spending this empire's culture pool would do. `planProduction`'s sibling
 * a fourth bucket over (Entry XVIII.1's three shapes: plan · settle · windfall
 * wrapper), and the pure half of "would this empire draft".
 *
 * `culture` defaults to the real pool; a caller weighing a grant that has not
 * landed yet — forgotten hymns in a ruin, The Lyceum's fifteen — passes what the
 * pool *would* hold, which is what lets a choice card promise a draft before it
 * is taken.
 *
 * `null` when the pool does not cover the threshold.
 */
export interface DraftPlan {
  /** Culture the pool gives up: the threshold exactly. */
  cost: number;
  /** What the empire's tier becomes. */
  tier: number;
  /** Culture left over, which stays in the pool toward the draft after this. */
  overflow: number;
  /** True when this draft is one the ladder offers a government at. */
  offersGovernment: boolean;
}

export function planDraft(player: Player, culture = player.culturePool): DraftPlan | null {
  const cost = nextDraftCost(player);
  if (culture < cost) return null;
  const tier = player.statecraft.drafts + 1;
  return {
    cost,
    tier,
    overflow: culture - cost,
    offersGovernment: GOVERNMENT_TIERS.includes(tier),
  };
}

/** What a draft did, for the line the interface announces it in. */
export interface DraftCompletion {
  /** The tier the empire reached. */
  tier: number;
  /** The offer it opened. */
  offer: OrderOffer;
  /** The government triple this tier banked, or `null`. */
  government: GovernmentOffer | null;
}

/**
 * Spends one fill of the meter: the tier climbs, the pool keeps the overflow,
 * and an offer is dealt from `state.rng`.
 *
 * **The one completion routine for the culture bucket** (Entry XVIII.1), used by
 * both the end-of-turn phase and the windfall wrapper below — extracted, never
 * duplicated, so the two paths cannot drift on what a draft costs, what it deals
 * or what it banks.
 *
 * A draft is *not* taken while one is already outstanding. That is the same rule
 * `discoveryClaimError` states for ruins and it is here for the same reason: an
 * offer is a decision the player owes the game, and a second one dealt on top of
 * it would silently destroy the first. The culture stays in the pool and the
 * draft happens the moment the outstanding one is answered — which the phase
 * does, on the next resolution, with no state of its own to remember it by.
 *
 * A **government** offer is banked at tiers 3/7/15 and does not block anything:
 * Entry XV makes adoption bankable on purpose, so an empire may climb two tiers
 * holding an unclaimed triple and take it when its slots are worth swapping.
 */
export function settleDraft(state: GameState, player: Player): DraftCompletion | null {
  const sc = player.statecraft;
  if (sc.pendingOrder !== undefined || sc.pendingDoctrine !== undefined) return null;
  const plan = planDraft(player);
  if (!plan) return null;

  player.culturePool = plan.overflow;
  sc.drafts = plan.tier;
  const offer = drawOrderOffer(state, player);
  sc.pendingOrder = offer;

  let government: GovernmentOffer | null = null;
  if (plan.offersGovernment) {
    const options = governmentsAtTier(plan.tier);
    if (options.length > 0) {
      government = { tier: plan.tier, options };
      sc.pendingGovernment = government;
    }
  }
  return { tier: plan.tier, offer, government };
}

/**
 * The mid-turn entry point: culture landed outside a phase, so settle it now.
 *
 * The fourth `settle…Windfall`, and the one `discoveries.ts` has been carrying a
 * stated absence for since Entry XX ("a `settleCultureWindfall` written today
 * would be a completion routine with nothing to complete"). There is something
 * to complete now. It is `settleDraft` plus nothing: a draft mutates no city's
 * derived state, so unlike the growth and production windfalls it owes the
 * mid-turn register no refresh — the empire owes the player a *decision*, and
 * the End Turn blocker is what collects it.
 *
 * It loops, because one lump of culture can cross two thresholds and a windfall
 * that paid only the first would leave the empire owed a draft it had earned.
 * The loop terminates on the first iteration in practice — `settleDraft` refuses
 * while an offer is outstanding, and it has just made one.
 */
export function settleCultureWindfall(state: GameState, player: Player): DraftCompletion | null {
  let first: DraftCompletion | null = null;
  for (;;) {
    const done = settleDraft(state, player);
    if (!done) return first;
    if (first === null) first = done;
  }
}

/** What a lump of culture would complete, in words, or `null`. The card's preview. */
export function draftSettledBy(player: Player, grant: number): string | null {
  const plan = planDraft(player, player.culturePool + grant);
  return plan === null ? null : `tier ${plan.tier}`;
}

/**
 * The Statecraft phase: every empire banks what it earned and drafts what it can
 * afford.
 *
 * Its position in `END_OF_TURN_PHASES` is a rules decision like every other
 * entry: directly after `advanceResearch`, because the two are the same shape —
 * an empire spending a pool `collectYields` filled at the top of the resolution
 * — and because a draft must be dealt from a board that has already grown, built
 * and learnt this turn. It is before `expandBorders` and that is harmless by
 * construction: border culture is a **separate channel** (`City.culture`) that
 * this phase never touches, which is the whole of "do not double-spend".
 *
 * The wild is skipped, exactly as `advanceResearch` skips it: it has no screen
 * to be asked on, so an offer left on that seat would hang forever behind a
 * blocker nobody can answer.
 *
 * There are no seals to tick — a seal is an absolute turn, compared rather than
 * maintained (see `SlottedOrder`).
 */
export function runStatecraft(state: GameState): void {
  for (const player of state.players) {
    if (player.barbarian) continue;
    settleDraft(state, player);
  }
}

// --- picking a card ---------------------------------------------------------

/**
 * How many options a draft is offering, upgrade included.
 *
 * The upgrade is the **last** option when there is one, so an index means the
 * same thing on every card that has four — see `OrderOffer`.
 */
export function orderOfferSize(offer: OrderOffer): number {
  return offer.options.length + (offer.upgrade === undefined ? 0 : 1);
}

/** True when this index names the upgrade option rather than a new card. */
export function isUpgradeIndex(offer: OrderOffer, index: number): boolean {
  return offer.upgrade !== undefined && index === offer.options.length;
}

/**
 * Why this player cannot take this option, or `null` when they can.
 *
 * **The** gate: the `chooseOrder` command refuses with this sentence and the
 * offer card is built from exactly the offer it answers `null` about, so a card
 * a player can click is a command the reducer takes. `discoveryChoiceError`'s
 * shape, and it asks nothing about the turn — that is a question about the actor
 * and belongs to the command.
 */
export function orderChoiceError(
  state: GameState,
  playerId: number,
  optionIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.statecraft.pendingOrder;
  if (!offer) return `${player.name} has no Statecraft draft awaiting a pick`;
  if (!Number.isInteger(optionIndex)) {
    return `chooseOrder needs an integer optionIndex, got ${String(optionIndex)}`;
  }
  const index = optionIndex as number;
  const size = orderOfferSize(offer);
  if (index < 0 || index >= size) return `Option ${index} is not one of the ${size} offered`;
  const id = isUpgradeIndex(offer, index) ? offer.upgrade : offer.options[index];
  // Only reachable from a hand-edited save or a data file retuned under a live
  // game; an offer naming a row this build does not have is unanswerable.
  if (!isOrderId(id)) return `Option ${index} names no known Order`;
  return null;
}

/** What a pick did, for the announcement. */
export interface OrderChoice {
  id: OrderId;
  name: string;
  /** The level the card is now held at. 1 for a new card. */
  level: number;
  /** True when this deepened a card the player already had. */
  upgraded: boolean;
}

/**
 * Takes one option and clears the offer. Validates nothing — the rule is
 * `orderChoiceError`'s and the command asks it first. `settleDiscovery`'s shape
 * exactly, and the mechanism rather than the rule.
 *
 * The offer is cleared **before** the card is added, for `settleDiscovery`'s
 * reason: anything reading `pendingOrder` during the addition would see a
 * decision that has in fact already been made. The key is *deleted* rather than
 * set to `undefined`, so a player who has answered a draft serialises identically
 * to one who has never had one.
 *
 * A new card lands in the **collection**, never in a slot. Slotting is its own
 * command because it is its own decision and it costs a seal — which is the
 * whole of Entry XV's swap friction, and would be given away by a draft that
 * auto-slotted.
 */
export function settleOrderChoice(player: Player, optionIndex: number): OrderChoice | null {
  const sc = player.statecraft;
  const offer = sc.pendingOrder;
  if (!offer) return null;
  const upgrade = isUpgradeIndex(offer, optionIndex);
  const id = upgrade ? offer.upgrade : offer.options[optionIndex];
  if (id === undefined || !isOrderId(id)) return null;

  delete sc.pendingOrder;
  for (const owned of sc.orders) {
    if (owned.id !== id) continue;
    owned.level += 1;
    return { id, name: orderDef(id).name, level: owned.level, upgraded: true };
  }
  sc.orders.push({ id, level: 1 });
  return { id, name: orderDef(id).name, level: 1, upgraded: upgrade };
}

// --- the slots --------------------------------------------------------------

/**
 * Why this card cannot go in this slot, or `null` when it can.
 *
 * Five refusals, and each is a rule rather than a guard: the player must hold
 * the card, the slot must exist, the card must not already be slotted, the slot
 * must be free, and the **type must match** — a wildcard slot takes anything and
 * a typed slot takes only its own (`orderFitsSlot`).
 *
 * There is deliberately no "swap" that empties an occupied slot: an occupied
 * slot is a sealed slot most of the time, and a verb that silently broke a seal
 * would be the one thing entry-locking exists to prevent. Unslot, then slot.
 */
export function slotOrderError(
  state: GameState,
  playerId: number,
  cardId: unknown,
  slotIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const sc = player.statecraft;
  if (!isOrderId(cardId)) return `"${String(cardId)}" is not a known Order`;
  if (orderLevel(sc, cardId) === 0) return `${player.name} does not hold ${orderDef(cardId).name}`;
  if (!Number.isInteger(slotIndex)) {
    return `slotOrder needs an integer slotIndex, got ${String(slotIndex)}`;
  }
  const index = slotIndex as number;
  const layout = slotTypesOf(sc);
  if (index < 0 || index >= layout.length) {
    return `${governmentDef(sc.government).name} has ${layout.length} slot(s), not ${index + 1}`;
  }
  if (isSlotted(sc, cardId)) return `${orderDef(cardId).name} is already slotted`;
  const held = sc.slots[index];
  if (held) return `Slot ${index + 1} already holds ${orderDef(held.card).name}`;
  const type = layout[index]!;
  if (!orderFitsSlot(cardId, type)) {
    return `${orderDef(cardId).name} is ${SLOT_WORDS[orderDef(cardId).slot]} and slot ${
      index + 1
    } is ${SLOT_WORDS[type]}`;
  }
  return null;
}

/** How a slot type reads in a refusal and on the screen. One table, one voice. */
export const SLOT_WORDS: Record<SlotType, string> = {
  military: 'military',
  economic: 'economic',
  wildcard: 'wildcard',
};

/**
 * Puts a card in a slot and **seals it**. Validates nothing — the rule is
 * `slotOrderError`'s.
 *
 * The seal is an *entry* lock (Entry XV): it starts the moment the card goes in,
 * so a posture change is anticipated rather than reactive — which is what
 * simultaneous turns need, since a swap made in response to what somebody else
 * did this window would be a decision taken after seeing their move. Length is
 * `sealTurnsFor`, which is the empire's, so The Loose Rein is felt at the moment
 * it matters.
 */
export function slotOrderAt(
  state: GameState,
  player: Player,
  cardId: OrderId,
  slotIndex: number,
): SlottedOrder {
  const slot: SlottedOrder = {
    card: cardId,
    sealedUntil: state.turn + sealTurnsFor(state, player.id),
  };
  player.statecraft.slots[slotIndex] = slot;
  return slot;
}

/** Turns left on a slot's seal, or 0 when it is free to move. */
export function sealRemaining(state: GameState, slot: SlottedOrder | null): number {
  if (!slot) return 0;
  return Math.max(0, slot.sealedUntil - state.turn);
}

/**
 * Why this slot cannot be emptied, or `null` when it can.
 *
 * Unslotting after the seal expires is **free** (Entry XV) — there is no cost,
 * no cooldown and no second seal on the way out, because the friction the design
 * wants is on *committing*, not on retreating.
 */
export function unslotOrderError(
  state: GameState,
  playerId: number,
  slotIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const sc = player.statecraft;
  if (!Number.isInteger(slotIndex)) {
    return `unslotOrder needs an integer slotIndex, got ${String(slotIndex)}`;
  }
  const index = slotIndex as number;
  if (index < 0 || index >= sc.slots.length) {
    return `${governmentDef(sc.government).name} has ${sc.slots.length} slot(s), not ${index + 1}`;
  }
  const slot = sc.slots[index];
  if (!slot) return `Slot ${index + 1} is empty`;
  const left = sealRemaining(state, slot);
  if (left > 0) {
    return `${orderDef(slot.card).name} is sealed for ${left} more turn${left === 1 ? '' : 's'}`;
  }
  return null;
}

/** Empties a slot. The card stays in the collection — it is never lost. */
export function unslotOrderAt(player: Player, slotIndex: number): OrderId | null {
  const slot = player.statecraft.slots[slotIndex];
  if (!slot) return null;
  player.statecraft.slots[slotIndex] = null;
  return slot.card;
}

// --- adoption ---------------------------------------------------------------

/**
 * Why this player cannot adopt this government, or `null` when they can.
 *
 * The offer is **banked**, so the only questions are whether one is banked at
 * all and whether the index names one of its three. There is no tier check
 * beyond that: an empire that climbed to tier 9 holding an unclaimed tier-7
 * triple may still take it, which is exactly what "bankable" means.
 */
export function governmentChoiceError(
  state: GameState,
  playerId: number,
  choiceIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.statecraft.pendingGovernment;
  if (!offer) return `${player.name} has no government offer to claim`;
  if (!Number.isInteger(choiceIndex)) {
    return `adoptGovernment needs an integer choiceIndex, got ${String(choiceIndex)}`;
  }
  const index = choiceIndex as number;
  if (index < 0 || index >= offer.options.length) {
    return `Choice ${index} is not one of the ${offer.options.length} offered`;
  }
  if (!isGovernmentId(offer.options[index])) return `Choice ${index} names no known government`;
  return null;
}

/** What an adoption did, for the announcement and the screens it re-opens. */
export interface GovernmentAdoption {
  id: GovernmentId;
  name: string;
  /** Cards that came out of their slots. Every one of them, always. */
  amnestied: OrderId[];
  /** The Doctrine draft the adoption opened, or `null` when the pool is empty. */
  doctrines: DoctrineOffer | null;
}

/**
 * Adopts a government: **the chapter break** (Entry XV.b).
 *
 * Three things happen in one breath, and they are one decision rather than
 * three. The **slot spread** changes, so the array is rebuilt to the new
 * government's layout. Every slotted card **returns to the collection
 * unsealed** — the amnesty, which is Civ VI's free-swap window derived rather
 * than ruled: a new spread with the old cards still pinned in it would be a
 * spread the player cannot use. And a **Doctrine draft opens**, drawn here
 * rather than at the next resolution because it belongs to *this* moment and a
 * draw taken later would be a draw taken from a moved generator.
 *
 * The banked offer is spent (the key deleted), so a tier's triple is claimed
 * once. Entry XV settles the open question: a government pick cannot be
 * revisited within a tier.
 *
 * Validates nothing — the rule is `governmentChoiceError`'s.
 */
export function adoptGovernmentAt(
  state: GameState,
  player: Player,
  choiceIndex: number,
): GovernmentAdoption | null {
  const sc = player.statecraft;
  const offer = sc.pendingGovernment;
  if (!offer) return null;
  const id = offer.options[choiceIndex];
  if (id === undefined || !isGovernmentId(id)) return null;

  // Spent before anything else, for `settleDiscovery`'s reason: the draw below
  // advances `state.rng`, and anything reading the banked offer during the
  // adoption would see a decision that has already been made.
  delete sc.pendingGovernment;

  const amnestied: OrderId[] = [];
  for (const slot of sc.slots) {
    if (slot) amnestied.push(slot.card);
  }
  sc.government = id;
  // Rebuilt rather than resized: the new layout's slot 2 is not the old one's,
  // so carrying anything across by index would seal the wrong card in the wrong
  // kind of slot. The amnesty is total by construction.
  sc.slots = slotLayout(id).map(() => null);

  // The Writ Extends. **Before** the Doctrine draw, so a triumph that fills the
  // renown ladder opens its great-person offer before this empire is handed a
  // second card to answer — and so the two draws spend `state.rng` in an order
  // a replay reproduces.
  awardOccasion(state, player.id, 'governmentAdopted');

  const doctrines = drawDoctrineOffer(state, player, offer.tier);
  let opened: DoctrineOffer | null = null;
  if (doctrines.options.length > 0) {
    sc.pendingDoctrine = doctrines;
    opened = doctrines;
  }
  return { id, name: governmentDef(id).name, amnestied, doctrines: opened };
}

/** Why this player cannot take this Doctrine, or `null`. `orderChoiceError`'s twin. */
export function doctrineChoiceError(
  state: GameState,
  playerId: number,
  optionIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.statecraft.pendingDoctrine;
  if (!offer) return `${player.name} has no Doctrine draft awaiting a pick`;
  if (!Number.isInteger(optionIndex)) {
    return `chooseDoctrine needs an integer optionIndex, got ${String(optionIndex)}`;
  }
  const index = optionIndex as number;
  if (index < 0 || index >= offer.options.length) {
    return `Option ${index} is not one of the ${offer.options.length} offered`;
  }
  if (!isDoctrineId(offer.options[index])) return `Option ${index} names no known Doctrine`;
  return null;
}

/** Takes a Doctrine. Permanent and slotless — it joins a list and never leaves it. */
export function settleDoctrineChoice(
  player: Player,
  optionIndex: number,
): { id: DoctrineId; name: string } | null {
  const sc = player.statecraft;
  const offer = sc.pendingDoctrine;
  if (!offer) return null;
  const id = offer.options[optionIndex];
  if (id === undefined || !isDoctrineId(id)) return null;
  delete sc.pendingDoctrine;
  sc.doctrines.push(id);
  return { id, name: doctrineDef(id).name };
}

// --- what the interface asks ------------------------------------------------

/**
 * Is this empire owed a decision that must be made before the turn can end?
 *
 * Two of the three offers block and one deliberately does not: a draft and a
 * Doctrine draw are decisions the empire *owes the game*, exactly as a claimed
 * ruin is, while a banked government is a decision the empire is **allowed to
 * defer** — Entry XV makes adoption bankable on purpose, and a blocker on it
 * would delete the only reason banking exists.
 */
export function statecraftBlocker(player: Player): string | null {
  const sc = player.statecraft;
  if (sc.pendingOrder !== undefined) return 'an Order draft is waiting';
  if (sc.pendingDoctrine !== undefined) return 'a Doctrine draft is waiting';
  return null;
}

/** Is any Statecraft card waiting to be answered or claimed? The top bar's badge. */
export function hasStatecraftOffer(player: Player): boolean {
  const sc = player.statecraft;
  return (
    sc.pendingOrder !== undefined ||
    sc.pendingDoctrine !== undefined ||
    sc.pendingGovernment !== undefined
  );
}

/** Every pool this table knows, for a screen that lists what is still drawable. */
export function poolSizeOf(sc: PlayerStatecraft): number {
  return livePool(sc).length;
}

/** The Orders of one pool, for the screen's browser. Re-exported for one import. */
export { poolOrders, slotCount };
