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
 * There are twenty-four shapes in the vocabulary and one walk over them
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

import type { BuildingId } from './buildingData';
import {
  capitalCityOf,
  cityResources,
  cityTile,
  controlledResources,
  isCoastalCity,
  nearestOwnedCity,
  resourceCopies,
  tileOwnerPlayerId,
} from './cities';
import { type Tile, getTileAt, neighborTiles, tileHex, wrappedDistance } from './map';
import { authorityOf, happinessOf } from './meters';
import type { ModifierStage } from './modifiers';
import { type CityYieldKey, type ResourceKind, resourceDef } from './resourceData';
import { nextFloat } from './rng';
import { type City, type GameState, type Player, type Unit, playerById } from './state';
import {
  type ActionRuleId,
  type BehaviorRuleId,
  type CardDefBase,
  type CardEffect,
  type CardId,
  type CardPayout,
  type CardRule,
  type CityScope,
  type CombatCondition,
  type CountKind,
  type DoctrineId,
  type EmpireCondition,
  type GovernmentId,
  type MeterRuleId,
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
 * first, floored **per figure** so two half-points pay for two halves.
 *
 * In the evaluator rather than in the data (see `statecraftData.ts`): a retune
 * is one number, not sixty-five rows, and an upgraded face is guaranteed to be
 * the printed face's shape rather than a second card that could disagree with
 * it. Magnitude-preserving on a malus too — Conscription's −2 happiness deepens
 * to −3, which is the tradeoff getting sharper as the card gets stronger.
 */
export function scaleByLevel(value: number, level: number): number {
  if (level <= 1 || value === 0) return value;
  const factor = STATECRAFT.upgradeMultiplier ** (level - 1);
  const scaled = value * factor;
  return scaled < 0 ? -Math.floor(-scaled) : Math.floor(scaled);
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
function drawWithoutReplacement<T>(state: GameState, from: readonly T[], count: number): T[] {
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

/**
 * Deals one draft: `offer.newCards` from the live pool, plus one owned card
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
 */
export function drawOrderOffer(state: GameState, sc: PlayerStatecraft): OrderOffer {
  const options = drawWithoutReplacement(state, livePool(sc), STATECRAFT.offer.newCards);
  const upgrades = drawWithoutReplacement(state, sc.orders.map((owned) => owned.id), 1);
  const offer: OrderOffer = { options };
  const target = upgrades[0];
  if (target !== undefined) offer.upgrade = target;
  return offer;
}

/**
 * Deals one Doctrine draft from a tier's pool, **without replacement within a
 * game** — a Doctrine already held is not offered again (Entry XV.b).
 */
export function drawDoctrineOffer(
  state: GameState,
  sc: PlayerStatecraft,
  tier: number,
): DoctrineOffer {
  const held = new Set<DoctrineId>(sc.doctrines);
  const pool = poolDoctrines(tier).filter((id) => !held.has(id));
  return { options: drawWithoutReplacement(state, pool, STATECRAFT.offer.doctrineOptions) };
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
} as const;

/**
 * The recursion cut for `conditionRule`. See the module docblock: while an
 * empire condition is being evaluated, gated effects contribute nothing, so a
 * condition that asks about a meter cannot ask about itself.
 */
let conditionDepth = 0;

/**
 * Every effect currently reaching this empire, in one fixed order: the
 * government's signature, then its Doctrines in the order they were taken, then
 * the slotted Orders in **slot order**.
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
        push(card, word, level, effect.then);
        continue;
      }
      list.push({ source: `${word} · ${cardDef(card).name}`, card, level, effect });
    }
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
  return list;
}

/** Every live effect of one kind. The shape every reader below is built on. */
function effectsOfKind<K extends CardEffect['kind']>(
  state: GameState,
  playerId: number,
  kind: K,
): { source: string; card: CardId; level: number; effect: Extract<CardEffect, { kind: K }> }[] {
  const list: {
    source: string;
    card: CardId;
    level: number;
    effect: Extract<CardEffect, { kind: K }>;
  }[] = [];
  for (const live of liveEffects(state, playerId)) {
    if (live.effect.kind !== kind) continue;
    list.push({
      source: live.source,
      card: live.card,
      level: live.level,
      effect: live.effect as Extract<CardEffect, { kind: K }>,
    });
  }
  return list;
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
  count: CountKind,
  city?: City,
): number {
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

  for (const { source, card, level, effect } of effectsOfKind(state, owner, 'cityYields')) {
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    const line = emptyLine(card, label(source, scopeNote(effect.scope)));
    for (const key of VOICES) line[key] = scaleByLevel(effect[key] ?? 0, level);
    if (paysSomething(line)) list.push(line);
  }

  for (const { source, card, level, effect } of effectsOfKind(state, owner, 'countScaled')) {
    const pays = effect.pays;
    if (pays.to !== 'yield' || pays.where !== 'city') continue;
    const times = helpings(countOf(state, owner, effect.count, city), effect.per, effect.max);
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
    const times = helpings(countOf(state, playerId, effect.count), effect.per, effect.max);
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
 * A card's line on a **hex**, as `explainTileYield` needs to read it.
 *
 * The one shape that crosses into the tile chain, and it is carried on
 * `TileYieldContext` rather than looked up there for that chain's stated reason:
 * `explainTileYield` knows about a tile and a context and nothing else — no
 * `GameState`, no player, no card table. So the context carries the *answer*
 * ("this empire pays +1 food on a hex with a resource on it") and the tile chain
 * only has to ask whether the hex qualifies.
 */
export interface CardTileLine {
  source: string;
  on: TileCondition;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

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
  const list: CardTileLine[] = [];
  for (const { source, level, effect } of effectsOfKind(state, playerId, 'tileYield')) {
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

  for (const { source, card, level, effect } of effectsOfKind(state, owner, 'percentYields')) {
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

  for (const { source, card, level, effect } of effectsOfKind(state, owner, 'countScaled')) {
    const pays = effect.pays;
    if (pays.to !== 'percent') continue;
    const times = helpings(countOf(state, owner, effect.count, city), effect.per, effect.max);
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
  category: 'unit' | 'building',
  unitType?: UnitTypeId,
): CardProductionLine[] {
  const list: CardProductionLine[] = [];
  for (const { source, card, level, effect } of effectsOfKind(state, city.ownerId, 'productionBonus')) {
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
): CardRuleLine[] {
  const list: CardRuleLine[] = [];
  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'rulePercent')) {
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
    if (effect.count === 'garrison' || effect.count === 'garrisonWatch' || effect.count === 'workedHills') {
      for (const city of state.cities) {
        if (city.ownerId !== playerId) continue;
        times += helpings(countOf(state, playerId, effect.count, city), effect.per, effect.max);
      }
    } else {
      times = helpings(countOf(state, playerId, effect.count), effect.per, effect.max);
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
    const times = helpings(countOf(state, playerId, effect.count), effect.per, effect.max);
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
  for (const { source, card, level, effect } of effectsOfKind(state, owner, 'combatLine')) {
    if (effect.side !== 'both' && effect.side !== situation.side) continue;
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
  for (const { source, card, level, effect } of effectsOfKind(state, city.ownerId, 'cityStat')) {
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
  for (const { source, card, level, effect } of effectsOfKind(state, playerId, 'windfallRider')) {
    if (effect.occasion !== occasion) continue;
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
      const amount = scaleByLevel(grant.amount, level);
      if (amount !== 0) {
        payout.grants.push({ card, source, yield: grant.yield, amount });
        payout.lines.push({ card, source, note: `+${amount} ${grant.yield}` });
      }
    }
  }
  // Summed, then applied once — see the docblock. Floored, because a windfall is
  // a whole number all the way down.
  if (percent !== 0 && base !== 0) payout.amount = Math.floor((base * (100 + percent)) / 100);
  return payout;
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
 * What an amplifier does to somebody else's number, as a whole signed percent.
 *
 * The Grand Bazaar's shape and the one hook that reaches *into* another
 * vocabulary: the flat happiness every luxury pays, and what a duplicate copy is
 * worth. The luxury table goes on saying what it says; this scales the reading.
 */
export function cardAmplifier(
  state: GameState,
  playerId: number,
  target: 'luxuryHappiness' | 'luxuryDuplicates',
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
  const def: CardDefBase = cardDef(id);
  const clauses: CardClause[] = [];
  for (const effect of def.effects) describeEffect(effect, level, clauses);
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
      if (words) out.push({ text: `${words} on every ${tileConditionWords(effect.on)}` });
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
      const scale = effect.scaled
        ? ` per ${effect.scaled.per} ${SCALE_WORDS[effect.scaled.count]}` +
          (effect.scaled.max === undefined ? '' : ` (at most ${signed(effect.scaled.max)})`)
        : '';
      out.push({ text: `${each} combat strength${scale} ${COMBAT_WORDS[effect.when.test]}`.trim() });
      return;
    }
    case 'unitStat': {
      const who = effect.class ? filterWords(effect.class) : 'all units';
      const where = effect.where === 'ownTerritory' ? ' inside your territory' : '';
      const amount = scaleByLevel(effect.amount, level);
      if (effect.stat === 'combatPercent') {
        out.push({ text: `${signed(amount)}% combat strength for ${who}${where}` });
        return;
      }
      out.push({ text: `${who}: ${signed(amount)} ${STAT_WORDS[effect.stat]}${where}` });
      return;
    }
    case 'windfallRider': {
      const occasion = OCCASION_WORDS[effect.occasion];
      if (effect.percent !== undefined) {
        out.push({ text: `${occasion} pays ${signed(scaleByLevel(effect.percent, level))}%` });
      }
      const grant = effect.grant;
      if (grant?.yield !== undefined && grant.amount !== undefined) {
        out.push({
          text: `${occasion} grants ${signed(scaleByLevel(grant.amount, level))} ${grant.yield}`,
        });
      }
      if (grant?.heal !== undefined) {
        out.push({ text: `${occasion} heals ${scaleByLevel(grant.heal, level)}` });
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
        out.push({ text: `new cities are founded with a ${effect.building}${limit}` });
      }
      return;
    }
    case 'countScaled': {
      const per = effect.per === undefined || effect.per === 1 ? '' : `${effect.per} `;
      const cap = effect.max === undefined ? '' : ` (at most ${effect.max})`;
      out.push({
        text: `${payoutWords(effect.pays, level)} per ${per}${COUNT_WORDS[effect.count]}${cap}`,
      });
      return;
    }
    case 'rateConversion': {
      const per = effect.per === 1 ? '' : `${effect.per} `;
      out.push({ text: `${payoutWords(effect.pays, level)} per ${per}${RATE_WORDS[effect.from]}` });
      return;
    }
    case 'offerRider':
      out.push({ text: OFFER_WORDS[effect.rule] });
      return;
    case 'effectAmplifier':
      out.push({
        text: `${AMPLIFIER_WORDS[effect.target]} ${signed(scaleByLevel(effect.percent, level))}%`,
      });
      return;
    case 'meterRule':
      out.push({
        text:
          effect.value !== undefined
            ? `${METER_RULE_WORDS[effect.rule]} is ${effect.value}`
            : `${METER_RULE_WORDS[effect.rule]} ${signed(effect.delta ?? 0)}`,
      });
      return;
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
    case 'unlocksBuilding':
      out.push({ text: `unlocks the ${effect.building}`, deferred: true });
      return;
    default: {
      const unhandled: never = kind;
      void unhandled;
      return;
    }
  }
}

function conditionValue(when: EmpireCondition): string {
  return when.test === 'cityCountAtMost' || when.test === 'cityCountAtLeast'
    ? ` ${when.value}`
    : '';
}

function scopeWords(scope?: CityScope): string {
  const note = scopeNote(scope);
  return note === null ? 'every city' : `every ${note}`;
}

function filterWords(filter: UnitFilter): string {
  if (filter.modelClass !== undefined) return `${filter.modelClass} units`;
  if (filter.ranged === true) return 'ranged units';
  if (filter.ranged === false) return 'melee units';
  if (filter.category !== undefined) return `${filter.category} units`;
  return 'all units';
}

function payoutWords(pays: CardPayout, level: number): string {
  if (pays.to === 'yield') return `${signed(scaleByLevel(pays.amount, level))} ${pays.yield}`;
  if (pays.to === 'happiness') return `${signed(scaleByLevel(pays.amount, level))} happiness`;
  if (pays.to === 'authority') return `${signed(scaleByLevel(pays.amount, level))} authority`;
  return `${signed(scaleByLevel(pays.percent, level))}% ${pays.yield}`;
}

function tileConditionWords(on: TileCondition): string {
  if (on.test === 'hasResource') return 'tile carrying a resource';
  if (on.test === 'hills') return 'hill tile';
  if (on.test === 'improved') return 'improved tile';
  return `${on.feature} tile`;
}

const RULE_WORDS: Record<CardRule, string> = {
  happinessDemand: 'happiness demanded per citizen',
  borderCost: 'culture for the next border tile',
  growthCarryover: 'of the basket kept when a city grows',
  tilePurchase: 'the price of buying a tile',
  borderCulture: 'border culture',
  settlerCost: 'the hammers a settler costs',
};

const COMBAT_WORDS: Record<CombatCondition['test'], string> = {
  always: '',
  vsBarbarians: 'against barbarians',
  ownTerritory: 'inside your territory',
  foreignTerritory: 'outside your territory',
  onHills: 'on hills',
  vsCity: 'against cities',
  targetBelowHalf: 'against units below half strength',
};

const SCALE_WORDS: Record<'cities' | 'adjacentFriendlies', string> = {
  cities: 'cities you hold',
  adjacentFriendlies: 'adjacent friendly units',
};

const STAT_WORDS: Record<'movement' | 'sight' | 'heal' | 'charges' | 'range', string> = {
  movement: 'movement',
  sight: 'sight',
  heal: 'healing per turn',
  charges: 'charge',
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
};

const COUNT_WORDS: Record<CountKind, string> = {
  uniqueLuxuries: 'unique luxury',
  luxuryCopies: 'improved luxury copy',
  improvedBonusResources: 'improved bonus resource',
  cities: 'city you hold',
  population: 'population',
  capitalPopulation: 'population in your capital',
  garrison: 'garrisoned unit',
  garrisonWatch: 'fortification level in the garrison',
  workedHills: 'worked hill tile',
  bankedFaith: 'banked faith',
  bankedGold: 'gold in the treasury',
  visibleCamps: 'camp you can see',
};

const RATE_WORDS: Record<RateSource, string> = {
  faithPerTurn: 'faith gained per turn',
  culturePerTurn: 'culture gained per turn',
  goldPerTurn: 'gold gained per turn',
  happiness: 'point of positive happiness',
  authority: 'point of positive authority',
};

const OFFER_WORDS: Record<OfferRuleId, string> = {
  discoveryClaimAll: 'every discovery pays all of its options',
  discoveryOfferSize: 'discoveries offer more options',
};

const AMPLIFIER_WORDS: Record<'luxuryHappiness' | 'luxuryDuplicates', string> = {
  luxuryHappiness: 'happiness from unique luxuries',
  luxuryDuplicates: 'duplicate luxury copies count at',
};

const METER_RULE_WORDS: Record<MeterRuleId, string> = {
  capturedCityCost: 'the authority a captured city costs',
  coastalCityCost: 'the authority a coastal city costs',
  cityHappinessDemand: 'the happiness every city demands',
  borderFreezeExempt: 'borders keep growing while the writ is torn',
  authorityUnitProductionExempt: 'a torn writ no longer slows production toward units',
};

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
  const offer = drawOrderOffer(state, sc);
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

  const doctrines = drawDoctrineOffer(state, sc, offer.tier);
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
