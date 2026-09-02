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
  bestMeleeFor,
  capitalCityOf,
  cityAt,
  cityResources,
  cityTile,
  controlledResources,
  empireRateReading,
  isCoastalCity,
  nearestOwnedCity,
  ownedTiles,
  queueCategory,
  realiseItem,
  resourceCopies,
  spawnTileFor,
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
import {
  type Family,
  type GreatPersonId,
  type LegacyRevocation,
  greatPersonDef,
  isGreatPersonId,
} from './greatPeopleData';
import {
  type ImprovementId,
  improvementDef,
  isGreatPersonWork,
  workForFamily,
} from './improvementData';
import { type ProjectId, type ProjectPayout, projectDef } from './projectData';
import { type Tile, getTileAt, neighborTiles, tileHex, wrappedDistance } from './map';
import { authorityOf, happinessOf } from './meters';
import type { ModifierStage } from './modifiers';
import {
  RELIGION,
  beliefDef,
  consecrationDef,
  isBeliefId,
  isConsecrationId,
  isRiteId,
  riteDef,
} from './religionData';
import { type CityYieldKey, type ResourceKind, resourceDef, resourceYield } from './resourceData';
import { nextFloat } from './rng';
import { connectedCities } from './roads';
import { RULES } from './rulesData';
import {
  type City,
  type GameState,
  type Player,
  type Religion,
  type TimedEffect,
  type Unit,
  cityReligion,
  followerCount,
  playerById,
  realPlayers,
} from './state';
import {
  type ActionRuleId,
  type AmplifierTarget,
  type CardPressureEffect,
  type PressureRuleId,
  type BehaviorRuleId,
  type CardCountScaledEffect,
  type CardDefBase,
  type CardEffect,
  type CardId,
  type CardPayout,
  type CardRule,
  type CardTileYieldEffect,
  type CityRuleId,
  type CityScope,
  type CombatCondition,
  type CombatScale,
  type CombatScaleCount,
  type CountKind,
  type DoctrineId,
  type EmpireCondition,
  type GovernmentId,
  type MeterRuleId,
  type OfferRiderScope,
  type OfferRuleId,
  type OrderId,
  type OrderPool,
  type OrderSlotGrant,
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
import { anyBeadDef, isBeadCardId } from './beadData';
import { beadCapEffects } from './beads';
import { awardOccasion } from './triumphs';
import { UNIT_UNLOCK_TECH, eraNumeral, highestAge, isTechId, techDef } from './techData';
import {
  type ModelClass,
  type UnitStamp,
  type UnitTypeId,
  UNIT_TYPE_IDS,
  isCombatant,
  isExplorer,
  unitDef,
  unitMaxHp,
} from './unitData';
import { isExploredBy, isVisibleTo } from './visibility';
import { isCoastal } from './water';

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
  /**
   * The Orders whose `onSlot` grant has already been paid, in the order it was
   * paid — the once-per-game flag for The Laureate's great person.
   *
   * A **list of ids** rather than a boolean per card, for `Player.legacies`'
   * reason exactly: it is the register of what has happened, so a second Order
   * with a slot grant needs no second field, and iteration order that is part of
   * the state is iteration order a replay reproduces. Presence is the state, and
   * nothing ever removes an entry — unslotting The Laureate and slotting it
   * again is not a second great person, which is what "once" means.
   */
  grantedOnSlot: OrderId[];
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
    grantedOnSlot: [],
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

/**
 * Every extra trade route this empire's cards grant, as labelled lines —
 * `explainOfferSize`'s second half at the scale of a caravan.
 *
 * It stops here, in the one module that switches on a `CardEffect.kind`, and
 * hands `trade.ts` a list it folds into `explainRouteSlots` beside the lines the
 * *buildings* supply. A market's slot and the Great Lighthouse's are one number
 * with two sources, exactly as authority capacity is.
 */
export function cardRouteSlots(state: GameState, playerId: number): OfferSizeLine[] {
  const lines: OfferSizeLine[] = [];
  for (const { source, level, effect } of effectsOfKind(state, playerId, 'routeRider')) {
    // A rider with no figure grants the ordinary one route, so a data row may
    // say only that it widens the fold. Scaled by level like every other figure.
    const extra = scaleByLevel(effect.extra ?? 1, level);
    if (extra === 0) continue;
    lines.push({ source, delta: extra });
  }
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
  building: 'Building',
  legacy: 'Legacy',
  religion: 'Religion',
  bead: 'Bead',
  tech: 'Technology',
  /**
   * The Cathedral's patron (Entry LV). It is prefixed with the building's own
   * name on the line — "Cathedral · The Choir Loft" — because a player reading a
   * ledger has to know *which* stones are paying, and "Consecration · The Choir
   * Loft" names the ceremony rather than the thing.
   */
  consecration: 'Cathedral',
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
  // The **tenth** class (Entry LV): a cathedral's patron. It is already a
  // `CardDefBase` on its row, so there is nothing to adapt — the arm exists so
  // that a breakdown line carrying a consecration id resolves to a name and a
  // `describeCard` like every other line, which is the whole reason `CardId` is
  // one id space.
  if (isConsecrationId(id)) return consecrationDef(id);
  if (isOrderId(id) || isDoctrineId(id) || isGovernmentId(id)) return cardDef(id);
  // The **seventh** class, and the one that walks: a great person's legacy is a
  // list of effects in this vocabulary on a row of another table
  // (`greatPeopleData.ts`), adapted into the card shape here rather than copied
  // into a second table that could disagree with it. Asked *before* the building
  // arm below, because the two id spaces are disjoint and the cheaper guard
  // should not have to prove it. A row with an **empty** legacy is a name whose
  // ratified text needs a shape that does not exist yet; it answers a
  // card-shaped nothing, which is exactly what it is worth to this evaluator.
  // The **eighth** class (the Bead Race): a bead's boon may carry a cap, and the
  // row is adapted into the card shape here for the great person's reason
  // exactly — one lookup, one label, one `describeCard`, rather than a parallel
  // evaluator for a fourth table. Asked before the building arm for its reason:
  // the id spaces are disjoint and the cheaper guard should not have to prove it.
  if (isBeadCardId(id)) {
    const { def } = anyBeadDef(id);
    const boon = 'boon' in def ? def.boon : undefined;
    return {
      name: def.name,
      flavor: 'flavor' in def ? def.flavor : '',
      effects: boon?.effects ?? [],
      deferred: def.deferred,
    };
  }
  if (isGreatPersonId(id)) {
    const def = greatPersonDef(id);
    return { name: def.name, flavor: def.epigram, effects: def.legacy, deferred: def.deferred };
  }
  // The **ninth** class (the tree pass of 2026-08-30): a technology's row may
  // carry effects in this vocabulary, and it is adapted here for the great
  // person's reason exactly — one lookup, one label, one `describeCard`, rather
  // than a parallel evaluator for a fifth table. Asked before the building arm
  // because the id spaces are disjoint and the cheaper guard should not have to
  // prove it. A node with no effects answers a card-shaped nothing, which is
  // what every ordinary technology is worth to this evaluator.
  if (isTechId(id)) {
    const def = techDef(id);
    return {
      name: def.name,
      flavor: def.flavor ?? '',
      effects: def.effects ?? [],
      deferred: def.deferred,
      note: def.note,
    };
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
 * wonders this empire's cities hold, then the legacies of the great people it
 * has spent, then what it is carrying that runs out, then the caps its beads
 * pay, then **the technologies it holds** (the tenth source, the tree pass of
 * 2026-08-30 — a node's gift is sometimes a rule), then the religions whose holy
 * city it holds.
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
  // spent, or it is a line here — and, since the 2026-08-28 ruling, a **revoked**
  // record is a third state that contributes nothing. That is *one filter*, on
  // this line, and it is the whole of the revocation mechanism on the reading
  // side: the record stays in spend order, history is never spliced, and
  // Archimedes' "lost the turn an enemy enters his city" is a rule with a place
  // rather than a sentence struck through on a card.
  for (const held of playerById(state, playerId)?.legacies ?? []) {
    if (held.revoked === true) continue;
    if (!isGreatPersonId(held.id)) continue;
    push(held.id, CLASS_WORD.legacy, 1, greatPersonDef(held.id).legacy);
  }
  // **The eighth source**: what the empire itself is carrying that runs out —
  // Crassus' bill. `City.timed` and `Unit.timed`'s third holder, read through
  // the same `timedLive` walk, so an effect hung on a realm is an ordinary card
  // effect in every ledger it reaches. It is *here* rather than in
  // `liveCityEffects` because its subject is the realm: a town's rites are a
  // fact about a town and this is a fact about everybody.
  const seat = playerById(state, playerId);
  if (seat?.timed !== undefined) list.push(...timedLive(state, playerId, seat));
  // **The ninth source** (the Bead Race, design ledger Entry VI): the *caps* a
  // bead's boon granted — a permanent step in contentment, in authority
  // capacity, in route capacity. Read off `Player.beads` every time rather than
  // settled once when the bead was earned, which is what keeps a bead's cap an
  // ordinary card effect in every ledger it reaches instead of a number
  // somebody added to a meter. `beadCapEffects` answers `[]` for the
  // overwhelmingly common seat holding no bead that pays one.
  //
  // Last, after the law, the gods, the stones, the dead and the bill, for the
  // reason each of those is last in turn: it is the order they were acquired
  // in, so no ledger reshuffles itself. A bead is `CardId`'s eighth class and
  // is adapted here rather than in `anyCardDef` — a bead is not drafted, not
  // slotted and not upgradable, so `scaleByLevel` has nothing to say about it
  // and its level is always one.
  if (seat) {
    for (const held of beadCapEffects(seat)) {
      for (const effect of held.effects) {
        if (effect.kind === 'conditionRule') continue;
        list.push({ source: `${CLASS_WORD.bead} · ${held.name}`, card: held.id, level: 1, effect });
      }
    }
  }
  // **The tenth source** (the tree pass of 2026-08-30): *the technologies you
  // hold*. A node's gift is sometimes a rule rather than a thing — the fallen
  // become verse, a seized town costs one authority less, settlers come
  // cheaper — and a technology is the most permanent card in the game: never
  // drafted, never slotted, never lost, so its level is always one and
  // `scaleByLevel` has nothing to say about it.
  //
  // Walked in `techsResearched` order, which is the order they were learnt, so
  // no ledger reshuffles itself. The overwhelming majority of rows carry
  // nothing, and the `effects` guard is what keeps this a cheap walk in a game
  // where an empire ends holding fifty of them.
  for (const id of playerById(state, playerId)?.techsResearched ?? []) {
    if (!isTechId(id)) continue;
    const effects = techDef(id).effects;
    if (effects === undefined || effects.length === 0) continue;
    push(id, CLASS_WORD.tech, 1, effects);
  }
  // **The seventh source** (`docs/religion-v2.md`, corrected by the user's
  // ruling of 2026-08-28): every religion whose **holy city this empire holds**.
  // Two things arrive together and they are two readings of one fact — that a
  // faith's seat is yours:
  //
  //   · its **enhancer** beliefs, pushed plainly, because they are ordinary
  //     cards of this vocabulary held by whoever holds the stones;
  //   · the **founder's trickle**, the standing payment for the followers it has
  //     in the world, written as data (`religion.json`) rather than as a rule so
  //     that doubling it is a card and not a branch.
  //
  // What is deliberately **not** here any more is the follower half. A follower
  // belief is city-local: it applies in every town that follows, to whoever owns
  // that town, and it reaches those towns through `liveCityEffects`. The fold
  // that used to sum it to the founder is gone rather than reworded, because a
  // fold and a city source would have been two answers to one question.
  //
  // Usually one religion, and a loop rather than a lookup because a conqueror
  // who takes a rival's holy city holds two — his own and the one he seized.
  // Walked in `state.religions` order, which is founding order, so no ledger
  // reshuffles itself.
  //
  // Last, after the law, the gods, the stones and the dead, for the reason each
  // of those is last in turn: it is the order they were acquired in.
  for (const mine of heldReligions(state, playerId)) {
    const word = `${CLASS_WORD.religion} · ${mine.name}`;
    for (const id of mine.enhancer) {
      if (!isBeliefId(id)) continue;
      push(id, CLASS_WORD.belief, 1, beliefDef(id).effects);
    }
    // The amplifier is read off the list **already built** rather than through
    // `cardAmplifier`, and that is not an optimisation: `cardAmplifier` asks
    // `liveEffects`, and asking it from inside itself is a stack overflow. By
    // this line every other source has been pushed, including the enhancer that
    // carries Apostles, so the reading is complete without re-entering.
    let amplifier = 0;
    for (const entry of list) {
      if (entry.effect.kind !== 'effectAmplifier') continue;
      if (entry.effect.target !== 'founderTrickle') continue;
      amplifier += scaleByLevel(entry.effect.percent ?? 0, entry.level);
    }
    for (const effect of RELIGION.founderTrickle) {
      list.push({
        source: word,
        card: mine.enhancer[0] ?? mine.follower[0] ?? sc.government,
        level: 1,
        effect: amplifyTrickle(effect, amplifier),
      });
    }
  }
  return list;
}

/**
 * Who a religion pays — **the owner of its holy city**, derived from the board
 * every time it is asked (user's ruling, 2026-08-28).
 *
 * The holy city is the town whose territory holds the hex the religion's *first*
 * holy site went up on (`Religion.holySite`). So the founder's trickle and the
 * enhancer beliefs follow the stones exactly as a wonder's effects follow the
 * city that holds it: **take a rival's holy city and you take what his faith
 * pays**, with no bookkeeping and nothing to transfer. `Religion.founderId` is
 * the history of who first raised it and never moves.
 *
 * Three ways the derivation falls back to `founderId`, and they are one rule
 * rather than three cases — *if there are no stones standing on owned ground,
 * the historical founder is paid*: the religion predates schema 29 and recorded
 * no hex, the site was **pillaged** (or chopped, or otherwise removed), or the
 * ground it stands on belongs to nobody (the holy city was razed and the borders
 * went with it). None of the three leaves a faith paying nobody, which would be
 * a trickle silently switched off.
 *
 * Derived and never stored, for `cityReligion`'s reason and `barbarianRoles`':
 * a stored payee is a second answer, and the first thing it does is disagree
 * with the map the turn a city changes hands.
 */
export function religionFounder(state: GameState, religion: Religion): number {
  const seat = religion.holySite;
  if (seat === undefined) return religion.founderId;
  const tile = getTileAt(state.map, seat.col, seat.row);
  if (!tile || tile.improvement !== HOLY_SITE) return religion.founderId;
  const owner = tileOwnerPlayerId(state, seat.col, seat.row);
  return owner === null ? religion.founderId : owner;
}

/**
 * The improvement a prophet plants, read off the improvement table's own
 * inverse rather than spelled here — `religion.ts` keeps the same constant by
 * the same call, and nothing in the simulation compares against `"holySite"`.
 */
const HOLY_SITE: ImprovementId = workForFamily('prophet') ?? 'holySite';

/**
 * The religions **this empire is paid by**: the ones whose holy city it holds.
 *
 * `foundedReligion`'s replacement everywhere the question is "what does my faith
 * pay me", and deliberately *not* its replacement where the question is "have I
 * founded one" — that is still a fact about history and still asks
 * `foundedReligion` (the gate on founding twice, the prophet's verbs).
 *
 * A list because a conqueror may hold two. Founding order, which `state.religions`
 * carries.
 */
export function heldReligions(state: GameState, playerId: number): Religion[] {
  const out: Religion[] = [];
  for (const religion of state.religions) {
    if (religionFounder(state, religion) === playerId) out.push(religion);
  }
  return out;
}

/**
 * The founder's trickle with Apostles folded in — **before anything is banked**,
 * which is `windfallPayout`'s discipline applied to a standing payment.
 *
 * It reaches the one figure a trickle row has (`countScaled`'s payout) and
 * nothing else, so a card that doubles what your followers pay you cannot
 * silently double a rule or a range. Zero amplification returns the row
 * untouched, so a game where nobody holds Apostles folds byte-identically to one
 * from before the card existed.
 */
function amplifyTrickle(effect: CardEffect, percent: number): CardEffect {
  if (percent === 0 || effect.kind !== 'countScaled') return effect;
  const pays = effect.pays;
  if (pays.to !== 'yield' && pays.to !== 'happiness' && pays.to !== 'authority') return effect;
  const amount = Math.floor((pays.amount * (100 + percent)) / 100);
  return { ...effect, pays: { ...pays, amount } };
}

/**
 * What one religion's **follower** beliefs put into one town, as ordinary
 * city-scoped effects.
 *
 * The user's ruling of 2026-08-28 in one function, and it is Civ V's split said
 * plainly: a follower belief applies **city-locally**, in every city that
 * follows the faith, to whoever owns that city. A rival's faith in your town is
 * a bonus you did not choose, not a wound — which is what removes every reason
 * for religious war.
 *
 * There is no fold here and there is deliberately nothing clever. The belief's
 * clauses are pushed **as written**, through the same `pushEffects` walk every
 * other card takes, into the live list of the town in hand; every reader that
 * goes through `liveCityEffects` then reads them exactly as it reads a
 * Doctrine's or a wonder's. The fold this replaced (`followerBeliefLines`, which
 * turned "in every city that follows" into one empire-scale line for the
 * founder) is **deleted rather than reworded**: two ways of reading one belief
 * would have been two answers, and the first thing they would have done is
 * disagree the turn a following city changed hands.
 *
 * Which religion's beliefs is `cityReligion(city)` — the strict majority of the
 * citizens, derived — so a town that turns this turn pays its new faith's
 * beliefs this turn (`spreadReligion` sits before `collectYields` for exactly
 * that).
 *
 * The label carries the religion's name, so a city panel reading
 * "Religion · the Grain Cult · Feast Days" says whose faith is paying and what
 * for, even when the faith is somebody else's.
 */
export function followerBeliefEffects(state: GameState, city: City): LiveCardEffect[] {
  const followed = cityReligion(city);
  if (followed === null) return [];
  const religion = state.religions[followed];
  if (!religion) return [];
  const list: LiveCardEffect[] = [];
  const word = `${CLASS_WORD.religion} \u00b7 ${religion.name}`;
  const push = (card: CardId, label: string, level: number, effects: readonly CardEffect[]): void => {
    pushEffects(state, city.ownerId, list, card, label, level, effects, push);
  };
  for (const id of religion.follower) {
    if (!isBeliefId(id)) continue;
    push(id, word, 1, beliefDef(id).effects);
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
  return [...liveEffects(state, city.ownerId), ...cityLocalEffects(state, city)];
}

/**
 * The cards that reach **this town and not its empire**: the buildings standing
 * in it, the rites hanging on it, and the follower beliefs of the faith it
 * follows.
 *
 * Split out of `liveCityEffects` so that a reader which sweeps the realm's towns
 * *itself* — `cardHappiness` is the one — can add the town-local half without
 * counting the empire's law once per city. The two halves are exactly
 * complementary: `liveEffects(owner) ++ cityLocalEffects(city)` is
 * `liveCityEffects(city)`, with no member in both.
 */
function cityLocalEffects(state: GameState, city: City): LiveCardEffect[] {
  return [
    ...cityBuildingEffects(state, city),
    ...timedLive(state, city.ownerId, city),
    ...followerBeliefEffects(state, city),
    ...consecrationEffects(state, city),
  ];
}

/**
 * What this town's **cathedral patron** contributes (design ledger Entry LV).
 *
 * The fourth city-local source, and the simplest one in the file: one card, held
 * permanently by one town, read off `City.consecration` — presence is the state,
 * so a town with no cathedral answers the empty list and pays for nothing.
 *
 * It is a source of `liveCityEffects` and **never of `liveEffects`**, for
 * `cityBuildingEffects`' reason exactly and one step stronger: a consecration is
 * a fact about *these stones*, so a second cathedral in a second town is a
 * second, independently rolled patron, and a dedication read from the empire's
 * end would pay every town for one town's saint. Because it is read off the
 * city, what it pays **follows the stones** — a captured cathedral pays its
 * captor from the turn the town changes hands, with no bookkeeping at all.
 *
 * Last of the four, after the buildings, the rites and the follower beliefs, for
 * the reason every source in this file is last in turn: it is the order they
 * were built in, so no ledger reshuffles itself.
 */
function consecrationEffects(state: GameState, city: City): LiveCardEffect[] {
  const id = city.consecration;
  if (id === undefined || !isConsecrationId(id)) return [];
  const def = consecrationDef(id);
  if (def.effects.length === 0) return [];
  const list: LiveCardEffect[] = [];
  const push = (card: CardId, label: string, level: number, effects: readonly CardEffect[]): void => {
    pushEffects(state, city.ownerId, list, card, label, level, effects, push);
  };
  // The bare class word, because `pushEffects` appends the card's own name — so
  // the line reads "Cathedral \u00b7 The Choir Loft". A religion's word carries the
  // faith's name as well because a belief's line has to say *which* faith; a
  // cathedral has only one thing to say.
  push(id, CLASS_WORD.consecration, 1, def.effects);
  return list;
}

/**
 * The effects the **ordinary buildings standing in this town** contribute.
 *
 * `BuildingDef.effects` promised this in so many words — "the day an ordinary
 * building wants a card effect it fills this in, and the evaluator will not
 * notice the difference" — and until the aqueduct wanted one (user, 2026-08-27:
 * "+15% surplus growth in city") the only reader was `liveEffects`' wonder
 * source, which is gated on `isWonder`. So the promise was half true: a row
 * could carry effects and nothing would read them.
 *
 * It is a source of `liveCityEffects` and **never of `liveEffects`**, and that
 * is the whole of the rule. A wonder is one per world and its clauses are
 * written to say which towns they reach (`{ test: 'hasBuilding' }` for "the one
 * it stands in"), so it belongs to the empire's walk; an ordinary building
 * stands in every town that built one, and a granary's effect landing on the
 * empire would be the same effect counted once per granary. The scope *is* the
 * building — `BuildingDef.cityStat`'s exact bargain one field over — so no row
 * here needs one and none of them carries one.
 *
 * Wonders are skipped rather than repeated: they arrive through `liveEffects`
 * already, and a wonder read from both ends would pay twice in its own city.
 */
function cityBuildingEffects(state: GameState, city: City): LiveCardEffect[] {
  const list: LiveCardEffect[] = [];
  const push = (card: CardId, word: string, level: number, effects: readonly CardEffect[]): void => {
    pushEffects(state, city.ownerId, list, card, word, level, effects, push);
  };
  for (const id of city.buildings) {
    if (isWonder(id)) continue;
    const effects = buildingDef(id).effects;
    if (effects === undefined || effects.length === 0) continue;
    push(id, CLASS_WORD.building, 1, effects);
  }
  return list;
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
    case 'authorityPositive':
      // The mirror, under the same recursion cut: an empire at exactly zero
      // satisfies neither arm, which is what "positive" and "negative" mean.
      return authorityReading(state, playerId) > 0;
    case 'happinessNegative':
      return happinessReading(state, playerId) < 0;
    case 'queueHolds': {
      // Read through `queueCategory` — the one place a queue row is sorted into
      // a category — so a wonder, a building and a project are told apart here
      // by exactly the rule production tells them apart by. `where: 'capital'`
      // narrows the sweep to one town; the default asks the realm.
      const only = when.where === 'capital' ? capitalCityOf(state, playerId)?.id : undefined;
      if (when.where === 'capital' && only === undefined) return false;
      for (const city of state.cities) {
        if (city.ownerId !== playerId) continue;
        if (only !== undefined && city.id !== only) continue;
        for (const row of city.queue) {
          if (queueCategory(row) === when.category) return true;
        }
      }
      return false;
    }
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

/**
 * Does a hex touching this town's own — or its own — carry this improvement?
 *
 * `isMountainAdjacent`'s reach exactly, asked of the works rather than of the
 * ground: the ring of six plus the centre, because a town founded *on* a shrine
 * is not further from it than its neighbour is. See the scope's docblock for why
 * it is the ring and not the work radius.
 */
function hasAdjacentImprovement(state: GameState, city: City, improvement: ImprovementId): boolean {
  const tile = getTileAt(state.map, city.col, city.row);
  if (!tile) return false;
  if (tile.improvement === improvement) return true;
  for (const neighbour of neighborTiles(state.map, tileHex(tile))) {
    if (neighbour.improvement === improvement) return true;
  }
  return false;
}

/**
 * **THE** question "can this town drink" — the board's answer, or a card's.
 *
 * The one predicate `cityScopeAdmits`' `freshwater` and `notFreshwater` arms go
 * through, and the only reader of the `cityRule` shape (Cistern Works). It is a
 * predicate rather than two copies of `cityTile(...).freshwater` precisely so
 * that a card declaring the fact cannot be true for one arm and false for its
 * mirror — a River Kings penalty that still bit a town the aqueducts had already
 * watered would be the two halves of one sentence disagreeing.
 *
 * It answers about a **town** and nothing wider: a hex's own fresh water is
 * `TileCondition`'s `freshwater` and the renewal's `requiresFreshwater`, and a
 * cistern in the town square does not water the third ring.
 */
function cityHasFreshwater(state: GameState, city: City): boolean {
  if (cityTile(state.map, city).freshwater) return true;
  return cardCityRule(state, city.ownerId, 'freshwater');
}

/** Does this empire hold a card declaring this fact about its cities? */
function cardCityRule(state: GameState, playerId: number, rule: CityRuleId): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'cityRule')) {
    if (effect.rule === rule) return true;
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
export function cityScopeAdmits(
  state: GameState,
  city: City,
  scope?: CityScope,
  viewerId?: number,
): boolean {
  if (!scope) return true;
  const test = scope.test;
  switch (test) {
    case 'coastal':
      return isCoastalCity(state, city);
    case 'freshwater':
      // Through the one predicate, so a card that declares the fact (Cistern
      // Works) and the river that supplies it are one answer. See it.
      return cityHasFreshwater(state, city);
    case 'notFreshwater':
      return !cityHasFreshwater(state, city);
    case 'mountainAdjacent':
      return isMountainAdjacent(state, city);
    case 'adjacentImprovement':
      return hasAdjacentImprovement(state, city, scope.improvement);
    case 'frontier':
      return isFrontierCity(state, city, scope.radius ?? FRONTIER_RADIUS);
    case 'captured':
      return city.captured;
    case 'capital':
      return capitalCityOf(state, city.ownerId)?.id === city.id;
    case 'notCapital':
      // The negation asked of the same answer, rather than of a second lookup:
      // a realm with no capital at all (none founded yet) has no city standing
      // here to ask about either, so the two arms cannot disagree.
      return capitalCityOf(state, city.ownerId)?.id !== city.id;
    case 'onHills':
      // The centre's own hex, exactly as `onTerrain` is. Hills are an overlay
      // and never a terrain — see the scope.
      return cityTile(state.map, city).hills;
    case 'populationAtLeast':
      return city.population >= scope.value;
    case 'populationAtMost':
      // Inclusive, exactly as its mirror is: "size 4 or less" reaches a town of
      // four, which is what the printed words say.
      return city.population <= scope.value;
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
    case 'hasBuildingYielding':
      // Asked of what a row *does*, off its own six voices, so a retuned library
      // moves the scope with it. `wonder: true` is Hero of Alexandria's half.
      return city.buildings.some(
        (id) =>
          (scope.wonder !== true || isWonder(id)) &&
          (buildingDef(id)[scope.yields] ?? 0) > 0,
      );
    case 'onTerrain':
      // The centre's own hex and nothing wider. See the scope's docblock.
      return cityTile(state.map, city).terrain === scope.terrain;
    case 'terrainInBorders':
      // What the *borders* have taken in, which is a different question from
      // what the centre stands on and from what touches it. `ownedTiles` is the
      // board's own answer, so a hex that changes hands changes this with it.
      return ownedTiles(state, city).some((tile) => tile.terrain === scope.terrain);
    case 'connected': {
      // The gold ledger's own fill, asked of the same board (`roads.ts`, the
      // leaf both readers can see). The capital is what the others are joined
      // *to*, so it is never in the list and never admits — see the scope.
      return connectedCities(state, city.ownerId).some((entry) => entry.city.id === city.id);
    }
    case 'follows': {
      // **"This town follows the religion this belief belongs to."** Since the
      // 2026-08-28 ruling a follower belief only ever reaches a town through
      // `followerBeliefEffects`, which pushes it into the live list of a city
      // that already follows the faith — so the subject the scope used to need a
      // `viewerId` for is the town in hand, and the clause is true by
      // construction there. Read of any other card it asks the only question
      // left with no religion named: does this place keep a faith at all.
      //
      // **Unless a reader names itself.** Cuius Regio is the first card whose
      // own text says *your* religion, and a viewer is how it says so: the town
      // must keep one of the faiths this empire is paid by (`heldReligions` —
      // the holy city's, so a conquered shrine moves the sentence with it).
      // Optional rather than required, because the follower pool has a town in
      // hand and no reader at all; absent is the wider reading above.
      if (viewerId === undefined) return cityReligion(city) !== null;
      const kept = cityReligion(city);
      if (kept === null) return false;
      return heldReligions(state, viewerId).some((religion) => religion.id === kept);
    }
    case 'all': {
      // Recursion into the same evaluator, which is the whole reason the
      // composite is a scope rather than a second field on every effect. The
      // viewer travels with it: a conjunction of "follows me" and "on the coast"
      // must mean the same "me" in both halves.
      for (const inner of scope.of) {
        if (!cityScopeAdmits(state, city, inner, viewerId)) return false;
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
    case 'connected':
      return 'joined to your capital';
    case 'coastal':
      return 'coastal city';
    case 'freshwater':
      return 'fresh water';
    case 'notFreshwater':
      return 'no fresh water';
    case 'mountainAdjacent':
      return 'mountain hold';
    case 'adjacentImprovement':
      return `beside a ${improvementDef(scope.improvement).name.toLowerCase()}`;
    case 'frontier':
      return 'near a rival';
    case 'captured':
      return 'captured city';
    case 'capital':
      return 'capital';
    case 'notCapital':
      return 'not the capital';
    case 'onHills':
      return 'hill city';
    case 'populationAtLeast':
      return `size ${scope.value}+`;
    case 'populationAtMost':
      return `size ${scope.value} or less`;
    case 'holding':
      return scope.resources.map((id) => resourceDef(id).name).join('/');
    case 'holdingCategory':
      return `${scope.category} seam`;
    case 'hasBuilding':
      return buildingDef(scope.building).name.toLowerCase();
    case 'hasBuildingYielding':
      return scope.wonder === true ? `${scope.yields} wonder` : `${scope.yields} building`;
    case 'onTerrain':
      return `${scope.terrain} city`;
    case 'terrainInBorders':
      return `${scope.terrain} in its borders`;
    case 'follows':
      return 'follows this faith';
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
      // **"In this city" is the same question of narrower ground**, the modifier
      // `population` and `improvedBonusResources` already carry: Pilgrimage pays
      // a following town for the luxuries *it* holds, and an empire-wide count
      // would have paid every following town for the whole realm's silks.
      // `cityResources` is the uniqueness reading every city-scale resource
      // question takes (`resourceEffects.ts`).
      if (effect.within === 'city') return city ? cityResources(state, city, 'luxury').length : 0;
      return controlledResources(state, playerId, 'luxury').length;
    case 'luxuryCopies': {
      let total = 0;
      for (const id of controlledResources(state, playerId, 'luxury')) {
        total += resourceCopies(state, playerId, id);
      }
      return total;
    }
    case 'duplicateLuxuries': {
      // The **kinds** there is more than one seam of — Village Fairs. The same
      // sweep `luxuryCopies` takes, counting names instead of copies, which is
      // why it is a member here rather than a second traversal somewhere else.
      let total = 0;
      for (const id of controlledResources(state, playerId, 'luxury')) {
        if (resourceCopies(state, playerId, id) >= 2) total += 1;
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
      return improvedResources(state, playerId, 'bonus', effect, city);
    }
    case 'improvedStrategicResources':
      // The same sweep with the other kind. See `improvedResources`.
      return improvedResources(state, playerId, 'strategic', effect, city);
    case 'cities':
      return cityCount(state, playerId);
    case 'population': {
      // **"In a city" is the same question of narrower ground** (the Republic's
      // culture per five citizens). `within: 'city'` is the modifier on the
      // count that `improvedBonusResources` already carries, and it means here
      // exactly what it means there: the sweep is over one town rather than the
      // realm, so a card written on it pays each town for its own citizens
      // instead of paying every town for the empire's.
      if (effect.within === 'city') return city?.population ?? 0;
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
    case 'workedUnimprovedTiles': {
      // `workedHills`' loop with the other question asked of the hex, and the
      // question is asked through `tileConditionHolds` so the count and the 🌿
      // ladder's tile lines cannot disagree about what "unimproved" means.
      if (!city) return 0;
      let total = 0;
      for (const cell of city.workedTiles) {
        const tile = getTileAt(state.map, cell.col, cell.row);
        if (tile && tileConditionHolds(tile, { test: 'unimproved' })) total += 1;
      }
      return total;
    }
    case 'wonders': {
      // A wonder is one per world, so the empire's own towns are the whole of
      // the question — and a captured wonder joins this count the turn the town
      // changes hands, which is the framework's rule (what a wonder pays follows
      // the stones).
      let total = 0;
      for (const town of state.cities) {
        if (town.ownerId !== playerId) continue;
        for (const id of town.buildings) {
          if (isWonder(id)) total += 1;
        }
      }
      return total;
    }
    case 'revealedTiles': {
      // The seat's own monotone grid, counted whole. Anything above `HIDDEN`
      // has been walked past once, which is what "revealed" means everywhere
      // else in the game — the level is read as a number here rather than
      // through `isExploredBy` because the address is the index a sweep already
      // holds and there are four thousand of them.
      const grid = state.visibility[playerId];
      if (!grid) return 0;
      let total = 0;
      for (const level of grid) {
        if (level > 0) total += 1;
      }
      return total;
    }
    case 'sightedCities': {
      // **Foreign** towns only: a seat's own cities are in its sightings too,
      // and a card that counted them would be paying twice for founding.
      let total = 0;
      for (const sighting of state.citySightings[playerId] ?? []) {
        if (sighting.ownerId !== playerId) total += 1;
      }
      return total;
    }
    case 'agesClosed':
      // The eras *behind* this empire. `highestAge` is 1-based and an empire in
      // the first age has closed nothing, so the floor at zero is the meaning
      // rather than a guard.
      return Math.max(0, highestAge(playerById(state, playerId)?.techsResearched ?? []) - 1);
    case 'unitsInField': {
      let total = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        if (!unitMatches(unit.type, effect.class)) continue;
        total += 1;
      }
      return total;
    }
    case 'buildingsOfCategory': {
      // `buildingsOfKind`'s sweep with the wider question — what a row is *for*
      // rather than which row it is. A line with no `category` is a data error
      // for that count's stated reason: it would silently pay per city.
      const wanted = effect.category;
      if (wanted === undefined) return 0;
      if (effect.within === 'city') {
        if (!city) return 0;
        let here = 0;
        for (const id of city.buildings) {
          if (buildingDef(id).category === wanted) here += 1;
        }
        return here;
      }
      let total = 0;
      for (const town of state.cities) {
        if (town.ownerId !== playerId) continue;
        for (const id of town.buildings) {
          if (buildingDef(id).category === wanted) total += 1;
        }
      }
      return total;
    }
    case 'defensiveBuildings': {
      if (!city) return 0;
      // A fortification is read off what a building *does* to its town — the
      // strength a besieger has to beat (`cityStat.defense`) or the bar it has
      // to empty (`cityHp`) — so a watchtower added to the table joins The Long
      // Watch for free and no list of names is kept anywhere.
      let total = 0;
      for (const id of city.buildings) {
        const def = buildingDef(id);
        const wall = def.cityStat?.stat === 'defense' && (def.cityStat.amount ?? 0) > 0;
        if (wall || (def.cityHp ?? 0) > 0) total += 1;
      }
      return total;
    }
    case 'discoveredCamps': {
      // `visibleCamps`' sibling on the monotone grid: a camp on ground this seat
      // has walked past counts until somebody burns it out. See the union.
      let total = 0;
      for (const camp of state.camps) {
        if (isExploredBy(state, playerId, camp.col, camp.row)) total += 1;
      }
      return total;
    }
    case 'tradeRoutes': {
      // Live routes this seat is running, counted off the board rather than
      // asked of `trade.ts` — which reads *this* module for its slot fold, so
      // the arrow only points one way. Expiry is the one comparison it is
      // everywhere else (`state.turn < expiresTurn`).
      let total = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        if (unit.trade === undefined) continue;
        if (state.turn >= unit.trade.expiresTurn) continue;
        total += 1;
      }
      return total;
    }
    case 'worldWonders':
      // The claim register, which is the one place a wonder is written down and
      // never moves — so this is exactly "how many marvels exist".
      return state.wonders.length;
    case 'foreignTradeRoutes': {
      // `tradeRoutes` and one more question of the same caravan, asked of the
      // board for that count's reason exactly. The far end is resolved fresh
      // every turn, so a partner that changes hands changes the count with it —
      // which is the same "what a wonder pays follows the stones" reading one
      // system over.
      let total = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        const route = unit.trade;
        if (route === undefined) continue;
        if (state.turn >= route.expiresTurn) continue;
        const partner = state.cities.find((city) => city.id === route.to);
        if (partner === undefined || partner.ownerId === playerId) continue;
        total += 1;
      }
      return total;
    }
    case 'followersHere': {
      // **The town's own congregation**, and the one count in the union that is
      // about a city's faith rather than about a founder's. `cityReligion` is
      // derived from the citizens, so this and the banner cannot disagree; a
      // town below a majority follows nothing and counts nothing, which is what
      // "the old gods" means everywhere else in this file.
      if (!city) return 0;
      const followed = cityReligion(city);
      if (followed === null) return 0;
      return followerCount(city, followed);
    }
    case 'followingCities':
    case 'followingForeign':
    case 'followingPop':
    case 'followingEmpires':
    case 'followingWithBuilding':
      // **The tide, counted, in one sweep** (`docs/religion-v2.md`). Five
      // readings of one question — which cities in the *world* follow the
      // religion this empire founded — so they share a body rather than
      // repeating the walk five times with one line different. An empire that
      // has founded nothing counts nothing, which is the honest answer and not
      // a guard.
      return followingCount(state, playerId, count, effect);
    default: {
      const unhandled: never = count;
      void unhandled;
      return 0;
    }
  }
}

/**
 * The five `following…` counts, over one sweep of `state.cities`.
 *
 * `cityReligion` is derived from the citizens, so this cannot disagree with the
 * banner a town flies; `state.cities` is founding order, which is what makes the
 * count an outcome the state's own order decides. **Empires** are counted
 * through a list rather than a `Set`, for the determinism rule — nothing in this
 * game iterates a `Set` — even though a count is order-blind, because the shape
 * of the loop is what the next person copies.
 *
 * "The religion this empire founded" became **the religions whose holy city this
 * empire holds** with the 2026-08-28 ruling, because these counts exist to size
 * the founder's trickle and the trickle follows the stones. A conqueror holding
 * two seats counts both tides; a founder who has lost his holy city counts
 * neither, which is the whole of what losing it costs.
 */
function followingCount(
  state: GameState,
  playerId: number,
  count: CountKind,
  effect: CardCountScaledEffect,
): number {
  const held = heldReligions(state, playerId);
  if (held.length === 0) return 0;
  const follows = (city: City): boolean => {
    const followed = cityReligion(city);
    return followed !== null && held.some((religion) => religion.id === followed);
  };
  let cities = 0;
  let foreign = 0;
  let population = 0;
  let withBuilding = 0;
  const empires: number[] = [];
  for (const city of state.cities) {
    if (!follows(city)) continue;
    cities += 1;
    population += city.population;
    if (city.ownerId !== playerId) foreign += 1;
    if (effect.building !== undefined && city.buildings.includes(effect.building)) {
      withBuilding += 1;
    }
    if (!empires.includes(city.ownerId)) empires.push(city.ownerId);
  }
  if (count === 'followingForeign') return foreign;
  if (count === 'followingPop') return population;
  if (count === 'followingEmpires') return empires.length;
  if (count === 'followingWithBuilding') return effect.building === undefined ? 0 : withBuilding;
  return cities;
}

/**
 * Improved seams of one kind, at whichever scale the line asks for.
 *
 * The body `improvedBonusResources` always had, lifted the day a second kind
 * wanted it (Shen Kuo's strategics), because the *reading* is the subtle part
 * and two copies of it would drift: at empire scale the count is of **copies**
 * — two improved wheat fields are two — and at town scale it is of **holdings**,
 * which is the uniqueness reading every city-scale resource question already
 * takes (`resourceEffects.ts`). One helper, so a card that names bonus seams and
 * one that names strategic seams can never disagree about what "improved" means.
 */
function improvedResources(
  state: GameState,
  playerId: number,
  kind: ResourceKind,
  effect: CardCountScaledEffect,
  city?: City,
): number {
  if (effect.within === 'city') {
    return city ? cityResources(state, city, kind).length : 0;
  }
  let total = 0;
  for (const id of controlledResources(state, playerId, kind)) {
    total += resourceCopies(state, playerId, id);
  }
  return total;
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
  /** What the **capital** banked in faith this turn. Theocracy's tithe. */
  capitalFaithPerTurn?: number;
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
    case 'capitalFaithPerTurn':
      return Math.max(0, Math.floor(rates.capitalFaithPerTurn ?? 0));
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
  'workedUnimprovedTiles',
  'defensiveBuildings',
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

  // One voice paid again as another, off the buildings of one category — The
  // Curia's science out of its shrines. A **flat** line like the two above it, so
  // it lands before Entry XVII's percentages: a mirrored beaker is worth what a
  // library's beaker is worth, and staging it twice would be paying a science
  // bonus on faith. The sum is the buildings' own figures and never the town's
  // total — see `CardMirrorYieldEffect`.
  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'mirrorYield')) {
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    let mirrored = 0;
    for (const id of city.buildings) {
      const def = buildingDef(id);
      if (def.category !== effect.category) continue;
      mirrored += def[effect.from] ?? 0;
    }
    if (mirrored === 0) continue;
    const line = emptyLine(card, label(source, `${effect.from} → ${effect.to}`));
    line[effect.to] = mirrored;
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
  /**
   * A percentage on **what the hex's improvement already pays**, where the six
   * voices below are a flat addition. See `CardTileYieldEffect.percent`, which
   * carries the whole argument; absent on every producer but a card, because a
   * granary's water line and a luxury's signature both pay flats.
   *
   * Read in `explainTileYield` (`cities.ts`) as one more labelled line of the
   * breakdown, computed off the improvement's own entries, so the list still
   * folds to the total.
   */
  percent?: number;
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
    case 'unimproved':
      // `improved`'s mirror, asked of the same field: **presence is the state**,
      // so ground whose works were pillaged away is unimproved again — which is
      // the reading the 🌿 ladder's cards want.
      return tile.improvement === undefined;
    case 'water':
      return isWaterTerrain(tile.terrain);
    case 'improvement':
      return tile.improvement === on.improvement;
    case 'greatWork':
      // Asked of the improvement table's own marker (`greatPerson`, presence is
      // the marker), never of a list of five names — so the sixth work joins
      // The Commonwealth with nothing here touched.
      return tile.improvement !== undefined && isGreatPersonWork(tile.improvement);
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

/**
 * The `tileYield` lines the **faith this town follows** puts on its ground — the
 * sixth producer of a `TileLine` (the 2026-08-28 ruling).
 *
 * Harvest Blessing's whole home: *+1 food on every farm worked by a city that
 * follows*. It is a fact about **one town**, exactly as a rite's is, so it joins
 * `cityContext` beside `timedCityTileLines` rather than `yieldContextFor` — a
 * pass with only a player in hand does not know which of his towns keep which
 * faith, and one that does would still be answering for the wrong ones.
 *
 * A scope is asked here rather than assumed, because a follower row may narrow
 * further than "follows" (a farm in a *freshwater* following town); `follows`
 * itself is true by construction on a city these effects reached at all.
 */
export function followerCardTileLines(state: GameState, city: City): CardTileLine[] {
  return tileLinesFrom(
    pickKind(followerBeliefEffects(state, city), 'tileYield')
      .filter(({ effect }) => cityScopeAdmits(state, city, effect.scope))
      .map((entry) => ({ ...entry, source: label(entry.source, scopeNote(entry.effect.scope)) })),
  );
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
    if (effect.percent !== undefined && effect.percent !== 0) {
      line.percent = scaleByLevel(effect.percent, level);
    }
    if (VOICES.some((key) => line[key] !== 0) || line.percent !== undefined) list.push(line);
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
  building?: BuildingId,
): CardProductionLine[] {
  const list: CardProductionLine[] = [];
  for (const { source, card, level, effect } of cityEffectsOfKind(state, city, 'productionBonus')) {
    if (effect.category !== category) continue;
    // The named row, where `modelClass` names a silhouette: Mimar Sinan's
    // mosques. Asked of what the city is actually building, exactly as the
    // silhouette is, so a bonus naming a building is silent on everything else.
    if (effect.building !== undefined && effect.building !== building) continue;
    // And the wider narrowing: what the row is *for* rather than which row it
    // is — The Encyclopaedia's science buildings.
    if (effect.buildingCategory !== undefined) {
      if (building === undefined) continue;
      if (buildingDef(building).category !== effect.buildingCategory) continue;
    }
    // *Where* the hammers land, where `modelClass` is *what* they land on. The
    // town is already in hand — a production modifier is asked of one city's
    // queue — so the scope is the ordinary one and needs no second reading.
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
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
    // **A rate may be narrowed to a town** (Common Table: a following city keeps
    // a quarter of its basket). A scope is a question about a *city*, so a
    // caller with none in hand cannot answer it and the line does not apply —
    // the same reading `cardTileLines` takes of a scoped hex line, and the
    // reason `growthCarryover` now hands its town in.
    if (effect.scope !== undefined) {
      if (!city || !cityScopeAdmits(state, city, effect.scope)) continue;
    }
    const percent = scaleByLevel(effect.percent, level);
    if (percent === 0) continue;
    list.push({ card, source: label(source, scopeNote(effect.scope)), percent });
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
 * **The empire's law is swept here; a town's own cards are swept beside it.**
 * This reader is empire-scoped by construction — it sweeps the realm's towns
 * itself rather than being handed one — so it walks `liveEffects` for the law
 * and then `cityLocalEffects` town by town for what only reaches one place: a
 * rite hanging on a city, and (since 2026-08-28) the **follower beliefs of the
 * faith that city follows**, which is how Feast Days pays a happiness a rival's
 * religion put in your town. The two walks are complementary by construction
 * (see `cityLocalEffects`), so nothing is counted twice.
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

  list.push(...cityLocalHappiness(state, playerId));
  return list;
}

/**
 * The happiness that reaches this empire **one town at a time** — a rite hanging
 * on a city, and the follower beliefs of the faith each of its cities follows.
 *
 * Summed per card so the ledger keeps its shape: three towns that all follow the
 * Grain Cult contribute one line labelled with the count, exactly as the
 * empire-scoped `per: 'city'` arm above does, because three lines saying
 * "Ur +1" would bury it.
 *
 * A `per: 'city'` clause and a bare one mean the same thing here and are read
 * the same way: the source *is* one town, so "in each such city" and "in this
 * city" are one sentence. The scope is still asked, because a follower belief
 * that names fresh water names it about the town it landed in.
 */
function cityLocalHappiness(state: GameState, playerId: number): CardMeterLine[] {
  const list: CardMeterLine[] = [];
  // Grouped by the label the line will carry, which already contains the card's
  // name and its source word — so two towns following two different religions
  // that happen to hold the same belief stay two lines, which is the honest
  // reading of "whose faith is paying". **An array, walked, never a `Map`**:
  // this list is an outcome, and nothing in this game iterates a keyed
  // collection for one.
  const totals: { card: CardId; source: string; amount: number; towns: number }[] = [];
  const add = (card: CardId, source: string, amount: number): void => {
    const held = totals.find((entry) => entry.source === source);
    if (held) {
      held.amount += amount;
      held.towns += 1;
      return;
    }
    totals.push({ card, source, amount, towns: 1 });
  };

  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const local = cityLocalEffects(state, city);
    for (const { source, card, level, effect } of pickKind(local, 'happiness')) {
      const each = scaleByLevel(effect.amount, level);
      if (each === 0) continue;
      if (!cityScopeAdmits(state, city, effect.scope)) continue;
      add(card, source, each);
    }
    for (const { source, card, level, effect } of pickKind(local, 'countScaled')) {
      if (effect.pays.to !== 'happiness') continue;
      const each = scaleByLevel(effect.pays.amount, level);
      if (each === 0) continue;
      const times = helpings(countOf(state, playerId, effect, city), effect.per, effect.max);
      if (times === 0) continue;
      add(card, source, each * times);
    }
  }

  for (const entry of totals) {
    if (entry.amount === 0) continue;
    list.push({
      card: entry.card,
      source: entry.towns === 1 ? entry.source : label(entry.source, `${entry.towns} cities`),
      amount: entry.amount,
    });
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
  /**
   * The type of the piece on the **other** side, or absent when that side is a
   * city (a town has no silhouette to be "vs mounted" about).
   *
   * `unit`'s mirror, and the field `combatLine.vsClass` reads. It is genuinely
   * the *other* side whichever side is asking — `planCombat` fills it with the
   * defender's type for the attacker's situation and the attacker's type for the
   * defender's — so one filter answers "against horse" for a card held by either
   * empire.
   */
  vsType?: UnitTypeId;
  /**
   * The **base strength** of the piece on the other side, or absent when that
   * side is a city.
   *
   * `vsType`'s sibling and filled from the same place by the same rule — the
   * defender's for the attacker's situation and the attacker's for the
   * defender's — so `strongerTarget` answers "am I outmatched" for a card held
   * by either empire. It is `UnitDef.combatStrength` and never the fold: a strength
   * line that read the ledger it is about to join would be a line inside its own
   * sum.
   */
  vsStrength?: number;
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
    case 'capturedCity': {
      // `inCity` and one more question of the same town, asked of the same
      // field `CityScope`'s `captured` asks of it.
      const here = cityAt(state, situation.tile.col, situation.tile.row);
      return here !== undefined && here.ownerId === situation.unit.ownerId && here.captured;
    }
    case 'onFeature':
      return situation.tile.feature === when.feature;
    case 'freshwater':
      return situation.tile.freshwater;
    case 'coastal':
      // The same predicate a coastal *city* is decided by — Entry I.b's one
      // evaluator, asked of a hex nobody has founded on.
      return isCoastal(state.map, situation.tile);
    case 'fortified':
      // A fact about the piece this line is being asked for, whichever posture
      // it is in: a dug-in unit that sallies is still dug in until the reducer
      // breaks the fortification, and `breakFortify` is what decides that.
      return situation.unit.fortifiedTurns !== undefined;
    case 'withinOfCity': {
      // A distance rather than a border: Deborah judges within sight of her own
      // people, which reaches ground nobody has claimed and stops short of a
      // colony's third ring. Measured off the contested hex, as every other
      // radius in the game is.
      const eye = tileHex(situation.tile);
      const reach = Math.max(0, Math.floor(when.hexes));
      for (const city of state.cities) {
        if (city.ownerId !== situation.unit.ownerId) continue;
        const seat = getTileAt(state.map, city.col, city.row);
        if (!seat) continue;
        if (wrappedDistance(state.map, eye, tileHex(seat)) <= reach) return true;
      }
      return false;
    }
    case 'strongerTarget':
      // Base against base — never the folded ledger, which would be a line
      // inside its own sum. A city has no such strength and never satisfies it,
      // which is `vsClass`' reading: nothing charges out of a town.
      return (
        situation.vsStrength !== undefined &&
        situation.vsStrength > unitDef(situation.unit.type).combatStrength
      );
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
  // **The one place a fight asks a *town's* cards.** Warrior Monks is a strength
  // line a *religion* puts on the walls of every city that follows it, and since
  // the 2026-08-28 ruling a follower belief reaches a town rather than an
  // empire — so the beliefs of whatever faith the town on the contested hex
  // keeps join the walk. Asked of the same `cityAt` lookup the `inCity`
  // condition asks, so a row written `inCity` and a row written for a following
  // city cannot disagree about which town they mean; the condition is still what
  // decides whose side it fights on, which is why a rival's monks do not defend
  // your assault on their gate.
  const here = cityAt(state, situation.tile.col, situation.tile.row);
  const live = here
    ? [...liveUnitEffects(state, situation.unit), ...followerBeliefEffects(state, here)]
    : liveUnitEffects(state, situation.unit);
  for (const { source, card, level, effect } of pickKind(live, 'combatLine')) {
    if (effect.side !== 'both' && effect.side !== situation.side) continue;
    // Which units the line reaches, asked of the same predicate `unitStat` asks
    // — the Alhambra's mounted +2. Of *this* piece, whichever side it is on, so
    // a line that pays both postures pays a knight in either.
    if (!unitMatches(situation.unit.type, effect.class)) continue;
    // And who it pays *against* — Lautaro's mounted. A line with `vsClass` never
    // fires at a city, which has no type at all: see `CardCombatLineEffect`.
    if (effect.vsClass !== undefined) {
      if (situation.vsType === undefined) continue;
      if (!unitMatches(situation.vsType, effect.vsClass)) continue;
    }
    if (!combatConditionHolds(state, situation, effect.when)) continue;
    const each = scaleByLevel(effect.amount, level);
    if (each === 0) continue;
    if (!effect.scaled) {
      list.push({ card, source, amount: each });
      continue;
    }
    const total = combatScaleCount(state, owner, situation.unit, effect.scaled);
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
 * What a strength line's `scaled` clause counts. One arm each, no default.
 *
 * `countOf`'s much smaller cousin, and separate from it on purpose: a
 * `CombatScale` is asked of a *fight* — it has a piece in hand and no city — so
 * the two counts share nothing but the word "count", and folding them would mean
 * handing `countOf` a unit it has no use for.
 */
function combatScaleCount(
  state: GameState,
  playerId: number,
  unit: Unit,
  scale: CombatScale,
): number {
  const count = scale.count;
  switch (count) {
    case 'cities':
      return cityCount(state, playerId);
    case 'adjacentFriendlies':
      return adjacentFriendlies(state, unit);
    case 'greatPeopleOfFamily':
      return greatPeopleEarned(state, playerId, scale.family);
    default: {
      const unhandled: never = count;
      void unhandled;
      return 0;
    }
  }
}

/**
 * Great people of one family this empire has **earned** — spent and standing
 * both.
 *
 * The two halves are where a name can be: `Player.legacies` is the roll of the
 * ones already given up to their act, and the board holds the ones still walking
 * (`Unit.person`). They never overlap — a person is consumed by its act and its
 * id is pushed onto the legacies in the same breath — so the sum is exactly "how
 * many has this realm ever been handed", which is what "earned this game" says.
 *
 * `GameState.recruited` is deliberately *not* the source: it is the world's
 * consumed roster and records no owner (see its docblock), so a count read off
 * it would pay The Empire for a rival's generals.
 */
function greatPeopleEarned(state: GameState, playerId: number, family?: Family): number {
  const player = playerById(state, playerId);
  if (!player) return 0;
  const admits = (id: GreatPersonId): boolean =>
    family === undefined || greatPersonDef(id).family === family;
  let total = 0;
  // **Revoked records still count.** "Earned this game" is what the line says,
  // and a general who is no longer heeded was still earned — the one place the
  // count and the effects read the same list differently, and it is stated on
  // `Player.legacies`.
  for (const held of player.legacies) {
    if (admits(held.id)) total += 1;
  }
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const person = unit.person;
    if (person === undefined) continue;
    if (admits(person)) total += 1;
  }
  return total;
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
  // "Scouts", asked of the roster's own marker (`isExplorer`) rather than of a
  // name — Wolf-Runners reaches the commando a later age adds without its row
  // being touched, exactly as `consecrates` reaches the prophet.
  if (filter.explores !== undefined && isExplorer(def) !== filter.explores) return false;
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
 *
 * `at` is the hex the piece is born on, which is what resolves *which town
 * raised it* — the one reading `CardUnitStatEffect.scope` has, and the reason
 * this is the only `unitStat` consumer that takes one. Cuius Regio's augurs are
 * charged by the faith of the city they were trained in, so a scoped line is
 * silent when no hex is passed and silent again when no town stands on it.
 */
export function cardExtraCharges(
  state: GameState,
  playerId: number,
  type: UnitTypeId,
  at?: { col: number; row: number },
): number {
  let total = 0;
  // Resolved once rather than per line: the birth hex does not move between
  // effects, and a town lookup per card would be a sweep of forty cities per
  // clause on a row that fires at every completion.
  const born = at ? cityAt(state, at.col, at.row) : undefined;
  for (const { level, effect } of effectsOfKind(state, playerId, 'unitStat')) {
    if (effect.stat !== 'charges') continue;
    if (!unitMatches(type, effect.class)) continue;
    // The scope asks about the town, and "my religion" asks about the empire
    // reading the card — the same `viewerId` a follower belief is admitted by.
    if (effect.scope !== undefined) {
      if (!born) continue;
      if (!cityScopeAdmits(state, born, effect.scope, playerId)) continue;
    }
    total += scaleByLevel(effect.amount, level);
  }
  return total;
}

/**
 * What this empire's law **stamps** on a piece born now — read by `createUnit`,
 * once, at the moment of the birth, and by nothing else.
 *
 * `cardExtraCharges`' argument for a second field, and the same one: a stamp is
 * a fact about a *moment*, so it is written into the unit rather than computed
 * on read. The Muster Roll's ten hit points belong to the levy that mustered
 * while the Order sat in its slot; unslotting it next year does not un-blood
 * them, and a bonus read live would have.
 *
 * It is deliberately **not** filtered by a `UnitFilter`: the ratified rows say
 * *newly created units*, and a stamp narrowed to a silhouette would be a
 * different card ("your spearmen are veterans") that nobody has ratified. The
 * day one is, the filter joins `CardUnitStampEffect` and is asked here beside
 * `unitMatches` like every other.
 *
 * Every figure is scaled by the Order's level like the rest of the vocabulary,
 * and a stamp that comes out to nothing at all is **not written** — see
 * `createUnit`, where presence is the state.
 */
export function cardUnitStamp(state: GameState, playerId: number): UnitStamp {
  let hp = 0;
  let strength = 0;
  for (const { level, effect } of effectsOfKind(state, playerId, 'unitStamp')) {
    if (effect.hp !== undefined) hp += scaleByLevel(effect.hp, level);
    if (effect.strength !== undefined) strength += scaleByLevel(effect.strength, level);
  }
  const stamp: UnitStamp = {};
  if (hp !== 0) stamp.hp = hp;
  if (strength !== 0) stamp.strength = strength;
  return stamp;
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
  /**
   * Pieces a rider gifts outright, already **drawn** — Camp Followers'.
   *
   * The roll happens here, with every other figure on the payout, because Entry
   * XVIII.5's rule is that the whole thing is composed before anything is banked
   * and a draw made later would be a draw the preview could not have promised.
   * What is left for `payWindfallGrants` is only the delivery, through
   * `realiseItem` — the one completion routine.
   */
  units: { card: CardId; source: string; type: UnitTypeId }[];
  /**
   * True when a rider heals **the whole army** — The Empire's. A flag and not a
   * figure, because the ratified text is *heals all*: a number here would have
   * been a second, quieter rule about how much.
   */
  healAll: boolean;
  /**
   * Effects a rider hangs on the **empire** until an absolute turn — Crassus'
   * bill. Composed here with every other figure (Entry XVIII.5) and stamped by
   * `payWindfallGrants`, which is the only writer of `Player.timed`.
   */
  timed: { card: CardId; source: string; turns: number; effects: CardEffect[] }[];
  /** Every rider that touched this payout, for the announcement. */
  lines: { card: CardId; source: string; note: string }[];
}

/**
 * Which side the occasion was against, where an occasion has a side.
 *
 * Today one question and one asker: a `kill` and a `death` know whether the
 * piece that fell belonged to the wild, and a rider carrying `vsBarbarians`
 * fires only when it did (Border Ballads). Passed rather than derived, because
 * by the time the riders are composed the fallen piece is off the board — the
 * caller is the only thing that still knows.
 */
export interface WindfallOccasionFacts {
  vsBarbarians?: boolean;
  /**
   * True when the town just taken held a wonder — The Empire's clause.
   *
   * `vsBarbarians`' sibling, passed for its reason exactly: the caller is the
   * only thing that still knows. A moment after the capture the stones are the
   * captor's own buildings and nothing can tell them from the ones he raised.
   */
  capturedWonder?: boolean;
}

/**
 * Composes the printed number for one occasion. `base` is what the occasion
 * pays with no cards at all; pass 0 for an occasion that has no figure of its
 * own (a death, a kill, a capture) and read the grants.
 *
 * `baseHeal` is the same idea for the *other* thing an occasion can pay
 * (2026-08-28): hit points the act itself restores, before a single card has
 * spoken. A pillage pays `improvements.pillageHeal` to whoever struck the works
 * and Scorched Earth adds to that; both arrive in `payout.heal` as one figure,
 * for exactly the reason the gold does — **the printed number is composed here
 * or it is composed twice**. It is deliberately *not* a `lines` entry: `lines`
 * is the register of what the **cards** did, and an occasion's own figure has
 * never appeared there (`base` does not either).
 */
export function windfallPayout(
  state: GameState,
  playerId: number,
  occasion: WindfallOccasion,
  base = 0,
  baseHeal = 0,
  facts: WindfallOccasionFacts = {},
): WindfallPayout {
  const payout: WindfallPayout = {
    amount: base,
    grants: [],
    heal: baseHeal,
    units: [],
    healAll: false,
    timed: [],
    lines: [],
  };
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
    // The occasion narrowed by who was on the other side of it. A rider that
    // asks for the wild and did not get it is simply not on this payout — the
    // same reading `combatLine`'s conditions take, one system over.
    if (effect.vsBarbarians === true && facts.vsBarbarians !== true) continue;
    // The same narrowing, one fact over: The Empire pays for a town with a
    // wonder in it and not for a town.
    if (effect.capturedWonder === true && facts.capturedWonder !== true) continue;
    if (effect.perAge === true) {
      ageMultiplied = true;
      if (era > 1) payout.lines.push({ card, source, note: `×${era} (Æra ${eraNumeral(era)})` });
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
    if (grant.healAll === true) {
      payout.healAll = true;
      payout.lines.push({ card, source, note: 'your units are healed' });
    }
    if (grant.timed !== undefined && grant.timed.effects.length > 0) {
      // The *turns* scale with an Order's level like every other figure on a
      // card, and the effects travel untouched: `timedLive` scales them the way
      // it scales a rite's, at level 1, because a bill is a bill.
      const turns = Math.max(1, scaleByLevel(grant.timed.turns, level));
      payout.timed.push({ card, source, turns, effects: grant.timed.effects });
      payout.lines.push({ card, source, note: `for ${turns} turns` });
    }
    if (grant.unit !== undefined) {
      // Drawn here, delivered later. `randomMilitary` is "one of the soldiers
      // this empire could raise today", which is what makes the gift keep pace
      // with the tree; the draw is `state.rng`, so a replay lands the same
      // spearman. A realm that can raise nothing at all is gifted nothing, and
      // says so by leaving the list empty.
      const roster = buildableMilitary(state, playerId);
      if (roster.length > 0) {
        const type = roster[Math.min(roster.length - 1, Math.floor(nextFloat(state.rng) * roster.length))]!;
        payout.units.push({ card, source, type });
        payout.lines.push({ card, source, note: `a ${unitDef(type).name} joins you` });
      }
    }
    if (grant.yield !== undefined && grant.amount !== undefined) {
      // **A figure quoted in turns** — The Lyceum's extra turn of culture. The
      // rate is read here, with every other figure on this payout, because Entry
      // XVIII.5's whole rule is that the number is composed once before anything
      // is banked: a preview that quoted one turn and a settlement that read the
      // rate again would be two answers to one sentence. Asked lazily, so an
      // occasion no such rider names never sweeps the empire's books.
      if (grant.fromRate !== undefined) {
        const turns = scaleByLevel(grant.amount, level);
        const rate = rateOf(state, playerId, grant.fromRate, empireRateReading(state, playerId));
        const amount = turns * rate;
        if (amount !== 0) {
          payout.grants.push({ card, source, yield: grant.yield, amount });
          payout.lines.push({ card, source, note: `+${amount} ${grant.yield}` });
        }
        continue;
      }
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
 * The **military** types this empire could raise right now, in roster order.
 *
 * The pool Camp Followers' gift is drawn from, and it is deliberately "could
 * raise" rather than "has ever unlocked": a card that keeps pace with the tree
 * is the whole of what "a random military unit" means on a card that will be
 * held for two hundred turns.
 *
 * The tech gate is asked of `UNIT_UNLOCK_TECH` directly rather than through
 * `buildError` (`tech.ts`), which reads *this* module and may not be read back.
 * That costs the resource clause — a card may gift a swordsman to an empire
 * with no iron — and that is the honest trade rather than an oversight: a
 * *gift* is not a levy, nothing was spent on it, and the alternative is a
 * runtime cycle. Rows sold out of their own bank (the augur) and rows that are
 * *called* rather than built (a great person) are excluded, in their own
 * markers, so nothing here compares a type against a name.
 *
 * **Roster order**, which is file order, because a draw over it is a seeded
 * outcome and an outcome that depends on an order must depend on an order the
 * data itself carries (CLAUDE.md's iteration rule).
 */
function buildableMilitary(state: GameState, playerId: number): UnitTypeId[] {
  const techs = playerById(state, playerId)?.techsResearched ?? [];
  const list: UnitTypeId[] = [];
  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    if (def.category !== 'military') continue;
    if (def.purchase !== undefined) continue;
    if (def.greatWork === true) continue;
    const gate = UNIT_UNLOCK_TECH.get(id);
    if (gate !== undefined && !techs.includes(gate)) continue;
    list.push(id);
  }
  return list;
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
 * Musters the pieces this empire's cards raise **on a cadence** — The Standing
 * Levy's spear, and nothing else today.
 *
 * `openPeriodicOffers`' twin one currency over, and it is written the same way
 * on purpose: a phase reads a list this file produced, the cadence is the same
 * absolute `turn % every === 0` comparison, and the delivery goes through
 * `realiseItem` — the one routine that means "the city now has the thing" — so
 * a levied spearman is spawned by production's own convention and goes on no
 * payroll (`free`, exactly as a windfall's gift does).
 *
 * A seat with no capital, no buildable melee row, or nowhere to put the piece
 * simply raises nothing this turn. That is the same refusal a purchase and a
 * completion grant get, and it is silent for their reason: a town with a full
 * doorstep is not an error, it is a full doorstep.
 *
 * The wild is skipped for `runStatecraft`'s reason — it holds no cards — and
 * every sweep is in `realPlayers`, roster, then card order, so a replay
 * reproduces the musters in one fixed order.
 */
export function musterPeriodicUnits(state: GameState): void {
  for (const player of realPlayers(state)) {
    for (const { effect } of effectsOfKind(state, player.id, 'periodicMuster')) {
      const every = Math.floor(effect.every);
      if (every <= 0 || state.turn % every !== 0) continue;
      const seat = capitalCityOf(state, player.id);
      if (!seat) continue;
      const type = effect.unit === 'bestMelee' ? bestMeleeFor(state, player.id) : effect.unit;
      if (type === null) continue;
      const tile = spawnTileFor(state, seat, type);
      if (!tile) continue;
      realiseItem(state, seat, { kind: 'unit', id: type, tile }, { free: true });
    }
  }
}

/**
 * Pays a windfall's *grants* — the voices a rider adds outright — into the
 * empire's banks and the nearest city's baskets.
 *
 * `at` is where the occasion happened, which is what resolves "its nearest
 * city": the same `nearestOwnedCity` a discovery uses, so a Widow's Levy and a
 * grain cache name the same town. Returns which cities were touched, so the
 * caller can settle them (the windfall settlement register in CLAUDE.md).
 *
 * `realized`, if passed, collects the pieces that actually found a hex to
 * stand on — type and the city they arrived in — for a caller whose
 * announcement needs to name them (Camp Followers'). Optional and additive
 * only: every existing caller that does not pass it sees no change at all.
 */
export function payWindfallGrants(
  state: GameState,
  player: Player,
  payout: WindfallPayout,
  at?: { col: number; row: number },
  realized?: { type: UnitTypeId; cityName: string }[],
): City[] {
  const touched: City[] = [];
  // **The pieces first**, because a gifted soldier is a thing that arrives
  // somewhere and the yields are book-keeping. Delivered through `realiseItem`
  // — the one routine that means "the city now has the thing" — so the spawn
  // convention is production's own and this is not a second way to mint a unit.
  // A town with nowhere to put it keeps the gift undelivered rather than
  // stacking a piece on a full hex; `spawnTileFor` is the same refusal a
  // purchase gets.
  for (const gift of payout.units) {
    const city = at ? nearestOwnedCity(state, player.id, at) : capitalCityOf(state, player.id) ?? null;
    if (!city) continue;
    const tile = spawnTileFor(state, city, gift.type);
    if (!tile) continue;
    // `free`, because a windfall is by definition a thing nobody paid for: the
    // Levies' spearman and Camp Followers' stray go on no payroll. See
    // `Unit.freeUpkeep`, entry 2.
    realiseItem(state, city, { kind: 'unit', id: gift.type, tile }, { free: true });
    realized?.push({ type: gift.type, cityName: city.name });
  }
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
  // **The whole army, made whole** — The Empire's. Written straight onto the
  // pieces rather than through `healUnits`, because that phase is the *rested*
  // rule and this is a windfall: a legion that marched into the breach this turn
  // is exactly the legion the clause is about. `state.units` order, so a replay
  // reproduces it.
  if (payout.healAll) {
    for (const unit of state.units) {
      if (unit.ownerId !== player.id) continue;
      unit.hp = unitMaxHp(unit);
    }
  }
  // **The only writer of `Player.timed`** — Crassus' bill, stamped at an
  // absolute turn like every other timed effect and swept by the same broom.
  // One entry per effect, `stampRite`'s shape, because every reader walks a flat
  // list and a nested one would be a second shape to unwrap.
  for (const hung of payout.timed) {
    const expiresTurn = state.turn + hung.turns;
    const list = player.timed ?? [];
    for (const effect of hung.effects) list.push({ card: hung.card, effect, expiresTurn });
    player.timed = list;
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
 * Every purchase rider this empire's cards put on **one thing for sale** — the
 * ordered lines `explainPurchaseCost` folds into its bank.
 *
 * A list rather than a number for rule 5's reason at the scale of a price tag:
 * the Religion screen prints the augur's price line by line, and a quarter off
 * with no name beside it is exactly the silence a breakdown exists to prevent.
 * The caller sums them and multiplies **once** — two riders on one purchase are
 * additive, as everything else in this game that stacks is.
 *
 * Two arguments where there was one, because Crassus and Jakob Fugger discount
 * "units and buildings" and a `UnitFilter` cannot name a granary: `kind` is what
 * the row's own `on` is matched against, and `type` is the unit's — required for
 * a unit, meaningless for a building. The filter is asked only of a unit, so a
 * building rider needs no vocabulary it does not have (see
 * `CardPurchaseRiderEffect`).
 */
export function cardPurchaseRiders(
  state: GameState,
  playerId: number,
  kind: 'unit' | 'building',
  type?: UnitTypeId,
): CardPurchaseLine[] {
  const list: CardPurchaseLine[] = [];
  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'purchaseRider')) {
    const on = effect.on ?? 'unit';
    if (on !== 'all' && on !== kind) continue;
    if (kind === 'unit' && (type === undefined || !unitMatches(type, effect.class))) continue;
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
/**
 * Does one of this empire's cards open this building row?
 *
 * `unlocksBuilding`'s one *rule* reader, and the shape stopped being a
 * description the day buildings could be bought (Entry XXIX): The Gilded Court
 * really does hand over the Gilded Hall now. Asked by `isUnlocked` (`tech.ts`)
 * for a row that declares `unlockedByCard`, so availability stays one question
 * with one answer rather than a card gate beside a tech gate.
 */
export function cardUnlocksBuilding(
  state: GameState,
  playerId: number,
  building: BuildingId,
): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'unlocksBuilding')) {
    if (effect.building === building) return true;
  }
  return false;
}

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
/**
 * How far this empire's cards move one number of **the tide**, in all.
 *
 * The `meterRule` pattern one system over (`cardMeterRule`): every live
 * `pressureRule` naming this rule, summed and scaled by its holding's level, so
 * two enhancer beliefs that both widen a range are additive exactly as
 * everything else in this game that stacks is. Read in exactly one place —
 * `explainPressure` (`religion.ts`) — which is what keeps the whole enhancer
 * pool a table of JSON rows.
 *
 * The rules that are really switches (`routeBothWays`) are read as "is this
 * above zero"; the shape has no boolean, and inventing one for a single row
 * would be a second way to say the same thing.
 */
export function cardPressureRule(
  state: GameState,
  playerId: number,
  rule: PressureRuleId,
): number {
  let total = 0;
  for (const entry of effectsOfKind(state, playerId, 'pressureRule')) {
    if (entry.effect.rule !== rule) continue;
    total += scaleByLevel(entry.effect.delta, entry.level);
  }
  return total;
}

/** One standing source of pressure a building projects. See `cardPressureSources`. */
export interface CardPressureSource {
  source: string;
  city: City;
  amount: number;
  range: number;
}

/**
 * Every **located** source of religious pressure this empire's buildings supply
 * — Hagia Sophia's, today.
 *
 * It walks the empire's towns rather than `liveEffects`, and that is the whole
 * reason it is a reader of its own: a pressure source presses *from somewhere*,
 * and `liveEffects` deliberately forgets which town a wonder stands in (its
 * clauses say so themselves through `hasBuilding`). A fold that had lost the
 * city could not answer "within eight hexes of what".
 *
 * It follows the stones like every other wonder reading: a captured Hagia Sophia
 * presses for its captor's faith the turn the town changes hands, because this
 * asks the town's `buildings` list and nothing else.
 */
export function cardPressureSources(state: GameState, playerId: number): CardPressureSource[] {
  const out: CardPressureSource[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    for (const id of city.buildings) {
      for (const effect of buildingDef(id).effects ?? []) {
        if (effect.kind !== 'pressure') continue;
        const pressure: CardPressureEffect = effect;
        out.push({
          source: `${isWonder(id) ? CLASS_WORD.wonder : CLASS_WORD.building} · ${buildingDef(id).name}`,
          city,
          amount: pressure.amount,
          range: pressure.range,
        });
      }
    }
  }
  return out;
}

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
/**
 * The payout a `renown` line's *count* is asked with, and it is never read.
 *
 * `countOf` takes a whole `CardCountScaledEffect` because that is the shape its
 * arguments live on (`building`, `category`, `class`, `within`), and a renown
 * line has none of them — it needs only the sweep. So the probe carries a
 * payout that satisfies the type and is discarded, rather than `countOf` growing
 * a second signature for callers that only want the number.
 */
const RENOWN_PROBE: CardPayout = { to: 'authority', amount: 0 };

export function cardRenownLines(state: GameState, playerId: number): CardRenownLine[] {
  const list: CardRenownLine[] = [];
  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'renown')) {
    const each = scaleByLevel(effect.amount, level);
    if (each === 0) continue;
    const per = effect.per;
    const helpings =
      per === 'city'
        ? cityCount(state, playerId)
        : per === 'wonder'
          ? countOf(state, playerId, { kind: 'countScaled', count: 'wonders', pays: RENOWN_PROBE })
          : 1;
    const amount = each * helpings;
    if (amount === 0) continue;
    list.push({
      card,
      source: per === undefined ? source : `${source} · ${each} per ${per} × ${helpings}`,
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
    if (effect.percent === undefined) continue;
    percent += scaleByLevel(effect.percent, level);
  }
  return percent;
}

/**
 * The **flat step** an amplifier puts on somebody else's number, summed.
 *
 * `cardAmplifier`'s other dial (see `CardEffectAmplifierEffect`), and it is
 * asked wherever the amplified figure is quoted *per item*: the happiness one
 * luxury pays (Ea-nāṣir's malice — every luxury counts one fewer) and the gold
 * one connected city pays (Nanaivandak's two). A target whose figure is a
 * whole-ledger total never asks it, which is a fact about that target rather
 * than a rule here.
 *
 * **Applied before the share**, so a card carrying both is one arithmetic and
 * not an argument about order.
 */
export function cardAmplifierFlat(
  state: GameState,
  playerId: number,
  target: AmplifierTarget,
): number {
  let amount = 0;
  for (const { level, effect } of effectsOfKind(state, playerId, 'effectAmplifier')) {
    if (effect.target !== target) continue;
    if (effect.amount === undefined) continue;
    amount += scaleByLevel(effect.amount, level);
  }
  return amount;
}

/** What a newly founded city of this empire is founded with. */
export interface FoundingRider {
  /** Extra population beyond the first. */
  population: number;
  /** Buildings it opens with, in walk order. */
  buildings: BuildingId[];
  /** True when the new town is joined to the realm by road. See the shape. */
  roads: boolean;
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
  const rider: FoundingRider = { population: 0, buildings: [], roads: false };
  const held = cityCount(state, playerId);
  for (const { level, effect } of effectsOfKind(state, playerId, 'foundingRider')) {
    if (effect.maxCities !== undefined && held >= effect.maxCities) continue;
    if (effect.population !== undefined) rider.population += scaleByLevel(effect.population, level);
    if (effect.building !== undefined && !rider.buildings.includes(effect.building)) {
      rider.buildings.push(effect.building);
    }
    if (effect.roads === true) rider.roads = true;
  }
  return rider;
}

/**
 * How long slotting an Order seals it, for this empire.
 *
 * The `metaRule` hook's one consumer — a card that rewrites a rule of Statecraft
 * itself (Entry XV.b).
 *
 * **A card's figure is read as a departure from the table's own**, and the
 * departures sum — Entry XVII's "additive within a stage, applied once" at the
 * scale of a rule. `min` used to be the fold, and it was right while the only
 * card that spoke *loosened* the seal (The Loose Rein's two turns); it silently
 * deleted the first card that tightened one, and Absolutism's ten-turn seal is a
 * **cost** it pays for six points of writ, so a fold that threw it away would
 * have made that card strictly better than its printed text. One card still
 * lands exactly on its own number — 5 + (2 − 5) is 2, and 5 + (10 − 5) is 10 —
 * which is what a player reads off the card either way.
 */
export function sealTurnsFor(state: GameState, playerId: number): number {
  let turns = METER.sealTurns;
  for (const { level, effect } of effectsOfKind(state, playerId, 'metaRule')) {
    if (effect.rule !== 'sealTurns') continue;
    turns += scaleByLevel(effect.value, level) - METER.sealTurns;
  }
  return Math.max(0, turns);
}

// --- words ------------------------------------------------------------------

/** One clause of a card, in words, for the screen and the offer cards. */
export interface CardClause {
  text: string;
  /** True for a clause this build does not implement. Printed struck through. */
  deferred?: boolean;
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
  | 'triumph';

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
/**
 * A loose list of effects, in words — `describeCard` for a caller that holds
 * effects rather than an id.
 *
 * The Bead Race is the one such caller: a boon's **cap** is a list of ordinary
 * `CardEffect`s on a row that is not a card table (`BeadBoon.effects`), and
 * `describeBeadBoon` has to print it in the same words an Order's would be
 * printed in. Exported rather than copied, because a second loop over
 * `describeEffect` is a second vocabulary the day an arm is added.
 */
export function describeEffects(effects: readonly CardEffect[], level = 1): CardClause[] {
  const clauses: CardClause[] = [];
  for (const effect of effects) describeEffect(effect, level, clauses);
  return clauses;
}

export function describeCard(id: CardId, level = 1): CardClause[] {
  const def: CardDefBase = anyCardDef(id);
  const clauses: CardClause[] = describeEffects(def.effects, level);
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
      // The percentage is its own clause, because it is a share of a *different*
      // number: the flat is what the card pays and this is what the works pay
      // half again of. Said as "the works on" so a player knows which half moved.
      if (effect.percent !== undefined && effect.percent !== 0) {
        out.push({
          text:
            `the works on every ${tileConditionWords(effect.on)} pay ` +
            `${signed(scaleByLevel(effect.percent, level))}% more${whose}`,
        });
      }
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
            buildingPlural(buildingDef(effect.building).name, 2),
          )
        : effect.buildingCategory
          ? `${effect.buildingCategory} buildings`
          : effect.modelClass
            ? `${effect.modelClass} units`
            : `${effect.category}s`;
      // The scope trails as its own clause, exactly as a scoped `tileYield`'s
      // does: "+20% production toward wonders, in your capital" says *where* the
      // hammers are quicker without turning the category into a possessive.
      const whose = effect.scope === undefined ? '' : `, in ${scopeWords(effect.scope)}`;
      out.push({
        text: `${signed(scaleByLevel(effect.percent, level))}% production toward ${what}${whose}`,
      });
      return;
    }
    case 'rulePercent':
      out.push({
        text:
          `${signed(scaleByLevel(effect.percent, level))}% ${RULE_WORDS[effect.rule]}` +
          // A rate that names towns says which, for `cityYields`' reason: an
          // unqualified "of the stored food kept when a city grows" reads as a
          // law of the realm, and Common Table is a law of one congregation.
          (effect.scope === undefined ? '' : `, in ${scopeWords(effect.scope)}`),
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
        text:
          `${signed(scaleByLevel(effect.points, level))} percentage points ` +
          'to the bonus your positive happiness pays',
      });
      return;
    case 'combatLine': {
      const each = signed(scaleByLevel(effect.amount, level));
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
      // A condition that takes an argument prints it here, so that forest and
      // jungle are one entry in `COMBAT_WORDS` and two rows on a card.
      const when =
        effect.when.test === 'onFeature'
          ? `${COMBAT_WORDS.onFeature} ${effect.when.feature}`
          : effect.when.test === 'withinOfCity'
            ? `${COMBAT_WORDS.withinOfCity} ${effect.when.hexes} ${
                effect.when.hexes === 1 ? 'hex' : 'hexes'
              } of one of your cities`
            : COMBAT_WORDS[effect.when.test];
      out.push({
        text: `${each} combat strength${who}${against}${scale} ${when}`.trim(),
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
    case 'unitStamp': {
      // "**Newly created**", exactly as the `charges` arm above says it, and for
      // that arm's reason: a stamp is written at the birth, so a soldier already
      // standing in the field gains nothing when the Order is slotted. A sentence
      // that promised a fleet-wide refit would be a card that lies.
      const hp = scaleByLevel(effect.hp ?? 0, level);
      const strength = scaleByLevel(effect.strength ?? 0, level);
      if (hp !== 0) {
        out.push({ text: `newly created units gain ${signed(hp)} maximum health` });
      }
      if (strength !== 0) {
        out.push({ text: `newly created units gain ${signed(strength)} combat strength` });
      }
      return;
    }
    case 'cityRule':
      out.push({ text: CITY_RULE_WORDS[effect.rule] });
      return;
    case 'windfallRider': {
      // The occasion, narrowed where the row narrows it — "killing a barbarian
      // unit" rather than "killing a unit". See `occasionWords`.
      const occasion = occasionWords(
        effect.occasion,
        effect.vsBarbarians === true,
        effect.capturedWonder === true,
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
          const turns = scaleByLevel(grant.amount, level);
          out.push({
            text:
              `${occasion} grants ${turns === 1 ? 'an extra turn' : `${turns} extra turns`} ` +
              `of ${grant.yield}${per}`,
          });
        } else {
          out.push({
            text: `${occasion} grants ${signed(scaleByLevel(grant.amount, level))} ${grant.yield}${per}`,
          });
        }
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
          text: `${occasion} heals ${further}${scaleByLevel(grant.heal, level)}${per}`,
        });
      }
      if (grant?.timed !== undefined && grant.timed.effects.length > 0) {
        // Said in the **nested clauses' own words**, so a bill and a blessing
        // read alike and a shape added to the vocabulary is printed here without
        // this arm being touched. The duration trails, because a player reads
        // *what happens* first and *how long* second — a rite's label does the
        // same thing from the other end.
        const inner: CardClause[] = [];
        for (const nested of grant.timed.effects) describeEffect(nested, level, inner);
        const turns = Math.max(1, scaleByLevel(grant.timed.turns, level));
        out.push({
          text:
            `${occasion} costs your empire ${inner.map((clause) => clause.text).join('; ')} ` +
            `for ${turns} turns${per}`,
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
      if (effect.percent !== undefined) {
        out.push({ text: `${occasion} pays ${signed(scaleByLevel(effect.percent, level))}%${per}` });
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
      if (effect.roads === true) {
        out.push({ text: `new cities are joined to your nearest city by road${limit}` });
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
    case 'routeRider': {
      // A figure, and a figure is a thing a player has to be told — "+1 trade
      // route". `offerRider`'s widening half, read the same way.
      const extra = scaleByLevel(effect.extra ?? 1, level);
      out.push({ text: `+${extra} trade ${extra === 1 ? 'route' : 'routes'}` });
      return;
    }
    case 'effectAmplifier': {
      // Two dials, one clause each, and a row that turns both says both — the
      // flat step first, because that is the order the arithmetic takes it in.
      if (effect.amount !== undefined) {
        out.push({ text: AMPLIFIER_FLAT_WORDS[effect.target](scaleByLevel(effect.amount, level)) });
      }
      if (effect.percent !== undefined) {
        out.push({ text: AMPLIFIER_WORDS[effect.target](scaleByLevel(effect.percent, level)) });
      }
      return;
    }
    case 'mirrorYield':
      out.push({
        text:
          `${effect.category} buildings supply ${effect.to} equal to their ` +
          `${effect.from}, in ${scopeWords(effect.scope)}`,
      });
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
      out.push({ text: `every ${effect.every} turns, ${what} musters in your capital` });
      return;
    }
    case 'unlocksBuilding':
      // No longer struck through: buildings can be bought (Entry XXIX) and
      // `cardUnlocksBuilding` is read by `isUnlocked`, so The Gilded Court
      // really does hand the Gilded Hall over.
      out.push({ text: `unlocks the ${buildingName(effect.building)}` });
      return;
    case 'pantheonSlots': {
      const slots = scaleByLevel(effect.amount, level);
      out.push({ text: `${signed(slots)} pantheon ${slots === 1 || slots === -1 ? 'slot' : 'slots'}` });
      return;
    }
    case 'purchaseRider': {
      const percent = scaleByLevel(effect.percent, level);
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
    case 'zocRule':
      out.push({
        text: 'every hex you own exerts zone of control on enemy units, as a unit of yours would',
      });
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
      const where =
        effect.per === 'city' ? ' in every city' : effect.per === 'wonder' ? ' per wonder you hold' : '';
      const family = effect.family === undefined ? '' : `, favouring ${effect.family}s`;
      out.push({
        text: `${signed(scaleByLevel(effect.amount, level))} renown per turn${where}${family}`,
      });
      return;
    }
    case 'pressureRule': {
      const delta = scaleByLevel(effect.delta, level);
      out.push({ text: PRESSURE_RULE_WORDS[effect.rule](delta) });
      return;
    }
    case 'pressure':
      out.push({
        text:
          `spreads your religion ${signed(scaleByLevel(effect.amount, level))} faith ` +
          `to every city within ${effect.range} hexes`,
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
 * What a `countScaled` is counting, as a noun in both numbers.
 *
 * `COUNT_WORDS` for every count whose noun is fixed, and the *building's own
 * name* for the one count that takes an argument — so "+1 happiness per
 * Barracks" and "per Temple" are one shape, one table entry and two data rows.
 */
function countNoun(effect: CardCountScaledEffect): PluralWords {
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
  return COUNT_WORDS[effect.count];
}

/**
 * What a `combatLine`'s `scaled` clause is counting, as a noun in both numbers.
 *
 * `countNoun`'s twin one table over, and it exists for the same reason: the one
 * count that takes an argument names it on the scale, so "per great general" and
 * "per great engineer" are one entry in `SCALE_WORDS` and two data rows.
 */
function scaleNoun(scale: CombatScale): PluralWords {
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
      into.qualifiers.push('beside a mountain');
      return;
    case 'adjacentImprovement':
      // The works named the way a tile condition names them — article outside
      // the mark, because "a" has no page in the book (`buildingWords`).
      into.qualifiers.push(
        `beside ${indefinite(improvementDef(scope.improvement).name)} ` +
          `${ref('improvement', scope.improvement, improvementDef(scope.improvement).name)}`,
      );
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
      into.qualifiers.push(`of ${scope.value}+`);
      return;
    case 'populationAtMost':
      // "of 4 or less", not "of −4": the threshold reads downward and a sign
      // would have printed a size nobody can have.
      into.qualifiers.push(`of ${scope.value} or less`);
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
    case 'terrainInBorders':
      // A qualifier and not an adjective, because the ground is not what the
      // town *is*: "every mountain city" would name the hex the centre stands
      // on, which is the neighbouring scope and a different card.
      into.qualifiers.push(`with a ${scope.terrain} hex inside its borders`);
      return;
    case 'follows':
      // "your religion" was the old ruling's wording and it is now wrong twice
      // over: the card may be printing in a compendium nobody's seat owns, and
      // a follower belief pays whoever holds the town rather than whoever
      // founded the faith.
      into.qualifiers.push('that follows the religion');
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
function indefinite(name: string): string {
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
  return isWonder(id) ? marked : `${indefinite(name)} ${marked}`;
}

/** A building's bare name, marked. `buildingWords` without the article. */
function buildingName(id: BuildingId): string {
  return ref(isWonder(id) ? 'wonder' : 'building', id, buildingDef(id).name);
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
    case 'greatWork':
      into.qualifiers.push("carrying a great person's work");
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
        `carrying ${on.resources.map((id) => ref('resource', id, resourceDef(id).name)).join(' or ')}`,
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
  return [...phrase.adjectives, 'hex', ...phrase.qualifiers].join(' ');
}

const RULE_WORDS: Record<CardRule, string> = {
  happinessDemand: 'happiness demanded per citizen',
  borderCost: 'culture for the next border hex',
  growthCarryover: 'of the stored food kept when a city grows',
  tilePurchase: 'the price of buying a hex',
  borderCulture: 'border culture',
  settlerCost: 'the production a settler costs',
  growthSurplus: 'food surplus stored toward growth',
  unitUpkeep: 'the gold your units cost in maintenance',
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
};

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
  completion: 'completing anything',
  buildingCompletion: 'completing a building',
  unitCompletion: 'completing a unit',
  capture: 'capturing a city',
  discovery: 'claiming a ruin',
  death: 'losing a unit',
  kill: 'killing a unit',
  pillage: 'pillaging',
  pillageTrader: 'plundering a caravan',
  tech: 'completing a technology',
  tilePurchase: 'buying a hex',
  rite: 'performing a rite',
  purchase: 'buying anything',
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

function occasionWords(
  occasion: WindfallOccasion,
  vsBarbarians: boolean,
  capturedWonder = false,
): string {
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
  population: { one: 'population', many: 'population' },
  capitalPopulation: {
    one: 'population in your capital',
    many: 'population in your capital',
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
  workedTilesInCity: { one: 'hex worked here', many: 'hexes worked here' },
  workedUnimprovedTiles: {
    one: 'unimproved hex worked here',
    many: 'unimproved hexes worked here',
  },
  wonders: { one: 'wonder you hold', many: 'wonders you hold' },
  revealedTiles: { one: 'hex you have revealed', many: 'hexes you have revealed' },
  sightedCities: { one: 'foreign city you have sighted', many: 'foreign cities you have sighted' },
  agesClosed: { one: 'age that has closed', many: 'ages that have closed' },
  // The filter is not in these words: `countNoun` prints it, so that "per melee
  // unit" and "per ranged unit" are one entry — `buildingsOfKind`'s bargain.
  unitsInField: { one: 'unit in the field', many: 'units in the field' },
  // The category is not in these words either: `countNoun` prints it, so that
  // "per gold building" and "per faith building" are one entry.
  buildingsOfCategory: { one: 'building', many: 'buildings' },
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
  followersHere: { one: 'follower in this city', many: 'followers in this city' },
};

const RATE_WORDS: Record<RateSource, PluralWords> = {
  faithPerTurn: { one: 'faith gained per turn', many: 'faith gained per turn' },
  capitalFaithPerTurn: {
    one: "faith your capital gains per turn",
    many: "faith your capital gains per turn",
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
  routeYields: (percent) => `trade routes pay ${signed(percent)}% more`,
  founderTrickle: (percent) =>
    `what your followers pay you is ${signed(percent)}% higher`,
  greatPersonAct: (percent) => `a great person's act pays ${signed(percent)}% more`,
  connectionYields: (percent) => `city connections pay ${signed(percent)}% more`,
  triumphRenown: (percent) => `every Triumph pays ${signed(percent)}% more renown`,
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
  cityHappinessDemand: 'the happiness every city demands',
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

const ACTION_WORDS: Record<ActionRuleId, string> = {
  freeChop: 'clearing a forest or jungle costs no worker charge',
  doubleOverflow: 'leftover production from a completed item is doubled',
  unitJumpsQueue: 'a unit that would finish sooner jumps ahead of a building in the queue',
  noSettlerEscalation: 'settlers never cost more than the first',
  buyGreatPersonWithGold: 'a great person waiting to be called may be bought with gold',
  buyGreatPersonWithFaith: 'a great person waiting to be called may be bought with faith',
};

/**
 * The facts a card simply declares true of a realm's towns. See `CityRuleId`.
 *
 * A whole sentence rather than a stem, `ACTION_WORDS`' shape, because a rule of
 * this kind has no figure to hang a noun phrase off — and the sentence says
 * *city* out loud, because the honest half of Cistern Works is which questions
 * it does not reach (a farm beside a river is a fact about the ground).
 */
const CITY_RULE_WORDS: Record<CityRuleId, string> = {
  freshwater: 'every city of yours counts as being on fresh water',
};

const BEHAVIOR_WORDS: Record<BehaviorRuleId, string> = {
  barbariansPassive: 'barbarians never attack you',
  barbarianKillsConvert: 'a barbarian you kill joins you instead of dying',
  noCampClearing: 'you can no longer clear a barbarian camp',
  noHealAbroad: 'your units do not heal outside your own borders',
  freeCityRoads: 'roads near your cities cost nothing to keep',
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
 * A **government** offer is banked at tiers 4/10/18 and does not block anything:
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
): SlotOutcome {
  const slot: SlottedOrder = {
    card: cardId,
    sealedUntil: state.turn + sealTurnsFor(state, player.id),
  };
  player.statecraft.slots[slotIndex] = slot;
  // **The once-per-game grant, claimed here and settled by the caller.** Here,
  // because this is the one place a card goes into a slot and a flag written
  // anywhere else is a flag some future slotting path forgets; settled by the
  // caller, because "gain a great person" is a renown windfall and `renown.ts`
  // reads *this* module — the arrow only points one way, so the reducer above
  // both is what turns the claim into an offer.
  const granted: OrderSlotGrant[] = [];
  const onSlot = orderDef(cardId).onSlot ?? [];
  if (onSlot.length > 0 && !player.statecraft.grantedOnSlot.includes(cardId)) {
    player.statecraft.grantedOnSlot.push(cardId);
    granted.push(...onSlot);
  }
  return { slot, granted };
}

/**
 * What slotting a card did: the sealed slot, and whatever it handed over once.
 *
 * A shape rather than a second out-parameter, `RealisedItem`'s argument at a
 * smaller scale — two kinds of news exist and a third joins the shape.
 */
export interface SlotOutcome {
  slot: SlottedOrder;
  /** The `onSlot` grants that fired *this time*. Empty on every later slotting. */
  granted: OrderSlotGrant[];
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
