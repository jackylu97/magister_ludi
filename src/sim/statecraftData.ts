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
 * `upgradeMultiplier` (default 1.5, per-effect override with `upgradeScale`),
 * floored per figure. Scaling lives in the evaluator rather than in the data, so
 * a retune is one number and not sixty-five.
 */

import statecraftJson from '../../data/statecraft.json';

import type { BuildingId } from './buildingData';
import type { ModifierStage } from './modifiers';
import type { CityYieldKey, ResourceId, ResourceKind } from './resourceData';
import type { ModelClass, UnitCategory } from './unitData';

// --- ids --------------------------------------------------------------------

export type GovernmentId = keyof typeof statecraftJson.governments & string;
export type DoctrineId = keyof typeof statecraftJson.doctrines & string;
export type OrderId = keyof typeof statecraftJson.orders & string;

/**
 * A card of any class, named the way the state stores it.
 *
 * The three classes are three *pools*, never three id spaces: a card id is
 * unique across the whole table, which is what lets a breakdown line carry one
 * string and lets `cardDef` be one lookup.
 */
export type CardId = GovernmentId | DoctrineId | OrderId;

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
  | { test: 'holdingCategory'; category: ResourceKind };

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
  | { test: 'targetBelowHalf' };

/** What a strength line counts, when it counts something. */
export type CombatScaleCount = 'cities' | 'adjacentFriendlies';

/** A strength line that scales with a count, capped where the design caps it. */
export interface CombatScale {
  count: CombatScaleCount;
  /** How many of the thing buys one helping. */
  per: number;
  /** The most it may ever be worth, in strength points. */
  max?: number;
}

/** Which units a `unitStat` reaches. Absent means every one. */
export interface UnitFilter {
  modelClass?: ModelClass;
  category?: UnitCategory;
  /** True: only types that shoot. False: only types that close. */
  ranged?: boolean;
}

/** What a tile must be for a `tileYield` line to land on it. */
export type TileCondition =
  | { test: 'hasResource' }
  | { test: 'hills' }
  | { test: 'feature'; feature: string }
  | { test: 'improved' };

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
  | 'visibleCamps';

/** What a `rateConversion` reads. A *rate* or a meter standing, never a bank. */
export type RateSource =
  /** Faith the empire banked this turn. */
  | 'faithPerTurn'
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
  | 'settlerCost';

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

/** Something about the world that stops being true. Today: one. */
export type BehaviorRuleId = 'barbariansPassive';

/** A rule of **Statecraft itself** that a card rewrites. Entry XV.b's metaRule. */
export type MetaRuleId = 'sealTurns';

/** What an amplifier reaches into. */
export type AmplifierTarget =
  /** The flat happiness every unique luxury pays. */
  | 'luxuryHappiness'
  /** What a *duplicate* copy of a luxury is worth, as a share of the first. */
  | 'luxuryDuplicates';

/** A draft offer a card rewrites. */
export type OfferRuleId = 'discoveryClaimAll' | 'discoveryOfferSize';

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
  /** A technology completed (`settleResearch`). */
  | 'tech'
  /** A tile bought (`purchaseTileAt`). */
  | 'tilePurchase';

/** What a rider adds on top of the occasion's own payout. */
export interface WindfallGrantSpec {
  /** A voice and an amount — culture on a kill, food on a camp. */
  yield?: CityYieldKey;
  amount?: number;
  /** Hit points restored to the acting unit. Pillage's, today. */
  heal?: number;
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

/** Hammers behind a category, optionally only behind one class of unit. */
export interface CardProductionBonusEffect {
  kind: 'productionBonus';
  category: 'unit' | 'building';
  percent: number;
  /** Narrows a unit bonus to one silhouette — the mounted line, today. */
  modelClass?: ModelClass;
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
}

/** A stat on a class of unit. Each stat has exactly one evaluator downstream. */
export interface CardUnitStatEffect {
  kind: 'unitStat';
  stat: 'movement' | 'sight' | 'heal' | 'charges' | 'range' | 'combatPercent';
  amount: number;
  class?: UnitFilter;
  /** Narrows the stat to units standing on their owner's ground. Imperium's. */
  where?: 'ownTerritory';
}

/** A rider on a windfall. See `WindfallOccasion` for what "rider" means. */
export interface CardWindfallRiderEffect {
  kind: 'windfallRider';
  occasion: WindfallOccasion;
  /** Scales the occasion's own payout, in whole percent. */
  percent?: number;
  /** Adds something the occasion did not pay at all. */
  grant?: WindfallGrantSpec;
}

/** What a newly founded city is founded *with*. */
export interface CardFoundingRiderEffect {
  kind: 'foundingRider';
  population?: number;
  building?: BuildingId;
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
}

/** A payout converted from a rate or a meter standing. See `RateSource`. */
export interface CardRateConversionEffect {
  kind: 'rateConversion';
  from: RateSource;
  per: number;
  pays: CardPayout;
}

/** A rule about a draft offer rather than about the world. */
export interface CardOfferRiderEffect {
  kind: 'offerRider';
  rule: OfferRuleId;
  amount?: number;
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
  | CardEffectAmplifierEffect
  | CardMeterRuleEffect
  | CardConditionRuleEffect
  | CardActionRuleEffect
  | CardBehaviorRuleEffect
  | CardCityStatEffect
  | CardMetaRuleEffect
  | CardTileYieldEffect
  | CardUnlocksBuildingEffect;

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

export interface OrderDef extends CardDefBase {
  pool: OrderPool;
  slot: SlotType;
  /** True for a card with no archetype thread. Presentation only. */
  neutral?: boolean;
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

export interface StatecraftOfferConfig {
  /** How many *new* cards a draft offers beside the upgrade. Entry XV: 3. */
  newCards: number;
  /** How many Doctrines an adoption offers. Entry XV.b: 3. */
  doctrineOptions: number;
}

export interface StatecraftConfig {
  meter: StatecraftMeterConfig;
  /** What a level-2 face multiplies its printed numbers by. */
  upgradeMultiplier: number;
  offer: StatecraftOfferConfig;
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
 * Any card by id, whichever class it is — the lookup a breakdown line and a
 * screen use, because neither of them cares which table a name came from.
 */
export function cardDef(id: CardId): CardDefBase {
  if (isOrderId(id)) return orderDef(id);
  if (isDoctrineId(id)) return doctrineDef(id);
  if (isGovernmentId(id)) return governmentDef(id);
  throw new Error(`Unknown card "${String(id)}"`);
}

/** A card's name, or the raw id when nothing knows it (a hand-edited save). */
export function cardName(id: CardId): string {
  if (isOrderId(id) || isDoctrineId(id) || isGovernmentId(id)) return cardDef(id).name;
  return String(id);
}

// --- pools ------------------------------------------------------------------

/** Every Order in one pool, in file order. */
export function poolOrders(pool: OrderPool): OrderId[] {
  return ORDER_IDS.filter((id) => orderDef(id).pool === pool);
}

/**
 * Which Order pool a government opens.
 *
 * A government's *tier* decides it rather than its id, so the three tier-3
 * governments all open pool I and a fourth added to that tier needs no edit
 * here. The chiefdom is tier 0 and opens the chiefdom pool.
 */
export function poolOfGovernment(id: GovernmentId): OrderPool {
  const tier = governmentDef(id).tier;
  if (tier <= 0) return 'chiefdom';
  if (tier <= 3) return 'governmentI';
  if (tier <= 7) return 'governmentII';
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
 * The culture tiers at which a government is offered, ascending — 3, 7, 15
 * today, read off the rows rather than restated.
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
