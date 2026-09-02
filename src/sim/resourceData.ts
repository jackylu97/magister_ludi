/**
 * Typed access to `data/resources.json`.
 *
 * The sibling of `terrainData.ts` and `unitData.ts`: the JSON is the single
 * source of truth for what a resource *is*, this file only types it and checks
 * that the ids it names are real. Nothing in the simulation hard-codes a yield,
 * a frequency or a terrain list — a designer retunes the whole table by editing
 * the JSON, and the map generator, the yield algebra, the production gate and
 * the renderer all follow it.
 *
 * A new row costs no TypeScript
 * -----------------------------
 * `ResourceId` is **derived from the JSON's own keys** rather than written out
 * as a union beside it. That is the difference between a table a designer can
 * extend and a table a designer can extend *if somebody also edits two files in
 * `src/`*: adding `"amber": { … }` to the JSON widens the type, widens
 * `RESOURCE_IDS`, and every exhaustive `Record<ResourceId, …>` that used to make
 * that a compile error has been turned into a lookup with a documented fallback
 * (see `RESOURCE_PROPS` in `board3d.ts` and `resourceIconSource` in
 * `badges3d.ts`). The one thing the derivation cannot do is invent a *prop* or
 * an *icon*, which is exactly why those two fall back instead of demanding one.
 *
 * Three kinds, three mechanical homes (design ledger, Entry IX)
 * -------------------------------------------------------------
 *   · **bonus** — fourteen of them. Pure tile-yield modifiers.
 *   · **strategic** — horses, iron. They *gate unit production* through
 *     `requiresResource` in `data/units.json`; see `buildError` in `tech.ts`.
 *   · **luxury** — twenty-five now, twenty-one on land and four in the sea. Each
 *     pays whatever its row puts on its tile, each is worth a flat
 *     `meters.happiness.perUniqueLuxury` to the empire that holds one, and most
 *     carry a **list of signature effects** on top of that — a base tier and,
 *     usually, a second one at Æra III. See `ResourceEffect` below and
 *     `resourceEffects.ts`, the one evaluator. `docs/luxuries.md` is the
 *     as-ratified reference, including what each row's *deferred* half waits for.
 *
 * The four sea luxuries are placed, fully specified and **inert**: no
 * improvement can be built on water yet, so nobody can hold one and none of
 * their signatures can fire. Their tile yields still pay whoever works the coast.
 * See `improvementData.ts`, which documents the same hole from the other side.
 *
 * The placement constraint shape
 * ------------------------------
 * Three optional filters that all have to agree — plain **AND**, never a
 * disjunction, because one rule per resource is a rule a designer can read off
 * the row:
 *
 *     validTerrain    the tile's terrain must be in this list        (required)
 *     validFeatures   the tile's feature must be in this list        (optional)
 *     hills           the tile's `hills` flag must equal this        (optional)
 *
 * An absent filter means "don't care". So `deer` is *forest on grassland,
 * plains or tundra* rather than the design note's looser "forest/tundra": deer
 * live in forests, taiga included, and expressing that as one AND rule is worth
 * more than matching the shorthand. `iron` is likewise *hills*, on any of the
 * four temperate terrains, rather than "hills or plains" — the ore is in the
 * high ground. Both readings are noted here because they are the two places
 * this table deliberately narrows the ledger.
 *
 * Mountains and snow appear in no `validTerrain` list, which is how "a mountain
 * is never a resource tile" is expressed: as data, not as a special case in the
 * placement loop. (`tileYieldOf` would happily add a resource's yield to a
 * mountain, and a citizen still could not be sent there — `workable` is a
 * separate question, see `terrainData.ts`.)
 *
 * `requiresTech` is the **reveal** gate: iron is on the map from turn one and is
 * simply not there, in any sense a player can act on, until Bronze Working.
 * Incense is the first *luxury* to use it — Divination reveals it — and it
 * needed no new mechanism, which is the whole argument for having built it as a
 * property of the row rather than a property of the strategic kind.
 *
 * It started as a display rule and is now the whole of what a resource *is* to
 * an empire, in three readings and one implementation (`resourceIsVisibleTo`):
 *
 *   · **shown** — the label, the hover card and the lens roundel, and since the
 *     per-seat reveal pass the diorama prop as well (`reveal3d.ts`).
 *   · **access** — `openedResource` in `cities.ts`: an empire cannot draw supply
 *     from a thing nobody in it has a word for, so a mine dug on a hill for its
 *     hammers does not hand over iron before Bronze Working.
 *   · **yield** — `explainTileYield` in `cities.ts`: an unrevealed seam pays
 *     nothing at all to the empire that owns it, and pays it the instant the
 *     tech lands. The earlier reading paid the yield and hid only the name, on
 *     the grounds that a hidden number would be a lie the panel keeps telling;
 *     the ratified reading is that the *number* was the lie.
 *
 * Three questions, one rule, no flags: all of it derived from the row and the
 * technologies held.
 *
 * `frequency` is a relative weight in the scatter's draw, not a count, and
 * `clusterSize` is the inclusive `[min, max]` a single find spreads over — so
 * horses arrive as a herd and gems as a single seam. Both are read only by
 * `resources.ts`.
 */

import resourcesJson from '../../data/resources.json';

import type { BuildingCategory, ProductionCategory } from './buildingData';
// Type-only, and it must stay that way: `improvementData.ts` imports
// `RESOURCE_IDS` from here as a *value* and validates at load, so a value import
// back would close a cycle around two tables that both build indexes on
// evaluation. See the note in `validateEffect`.
import type { ImprovementId } from './improvementData';
import {
  FEATURE_IDS,
  type FeatureId,
  TERRAIN_IDS,
  type TerrainId,
  type TileYield,
  type TileYieldSpec,
  readTileYield,
} from './terrainData';
import { TECH_AGES, TECH_IDS, type TechAge, type TechId, eraNumeral } from './techData';

/**
 * Every resource the table names — read off the JSON's keys, so a new row is a
 * new member of this type with no edit here. See the module docblock.
 */
export type ResourceId = keyof typeof resourcesJson.resources & string;

/** What a resource *is for*. See the module docblock. */
export type ResourceKind = 'bonus' | 'strategic' | 'luxury';

/**
 * A bag of yields an effect pays, every field optional and absent meaning zero.
 *
 * Six voices, the same six a `TileYield` carries since the luxuries pass — a
 * luxury's signature is a fact about a *city* or an *empire* rather than about a
 * hex, and faith, science and culture all exist at those scales.
 */
export interface ResourceYieldBag {
  food?: number;
  production?: number;
  gold?: number;
  science?: number;
  culture?: number;
  faith?: number;
}

/** A yield a percentage may be taken of. Every voice a city banks. */
export type CityYieldKey = 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith';

/**
 * Which of an empire's cities an effect lands in. Absent means every one.
 *
 * One word rather than one shape per scope, because "in every coastal city" is
 * the *same* effect as "in every city" asked of a smaller set — and pearls,
 * coral and whales all want the smaller set for the same reason (they are dug
 * out of the sea and the sea is what a harbour town is next to).
 *
 * `'owner'` is the smallest set of all: the city that actually holds the seam.
 * It was its own shape (`cityYields`) before the ratified table landed, and it
 * became a scope when that table turned out to be **wide everywhere** — no row
 * declares it today. Folding it in rather than deleting it keeps a real reading
 * available at the cost of one word, and it is exercised by a row invented at
 * runtime in `test/resourceEffects.test.ts`, which is the same proof the table's
 * data-drivenness rests on.
 *
 * `'capital'` is the *other* small set, and it arrived with the nerf round of
 * 2026-09-02: one city, and the one city an empire cannot found a second of. It
 * is what the ratified text means by "in your capital" (coffee, cotton, olives,
 * honey, coral, whales, tyrian), and it exists because a flat paid into **every**
 * town is the shape that made a wide empire's tenth city as good as its first —
 * a capital line is a fixed amount however far the borders run, which is the
 * same tall-friendly reading `empireYields` gives one grade out.
 */
export type ResourceCityScope = 'all' | 'coastal' | 'owner' | 'capital';

/**
 * A rule of the simulation a signature may put a signed percentage on.
 *
 * Three, and the union stays **a subset of `CardRule`** (`statecraftData.ts`) on
 * purpose: `ruleFactor` (`meters.ts`) asks both vocabularies the same question
 * and sums the two answers, so a word this table knew and the cards did not
 * would be a word that fails to compile there. That is exactly why spices' share
 * of the connections line is `connectionPercent` — its own shape, one consumer —
 * rather than a fourth rule nobody else could name.
 */
export type ResourceRule = 'happinessDemand' | 'borderCost' | 'growthCarryover';

/**
 * The two *modifiers* every shape below may carry.
 *
 * They are on the wrapper rather than on individual kinds because they are
 * orthogonal to what an effect does: any effect can belong to a later age, and
 * any effect can be told to scale with copies. Writing them once is what stops
 * `fromAge` meaning one thing on a yield shape and another on a happiness one.
 */
export interface ResourceEffectModifiers {
  /**
   * The age this tier switches on, gated on the holder's `highestAge`. Absent
   * means "from the first turn".
   *
   * The ratified table gives every luxury a **second tier** at Æra III, so a row
   * carries a list of effects and the late ones carry this. A tier that has not
   * arrived is still *shown* — the hover names it and labels it locked — because
   * a payoff a player cannot see is a payoff they cannot plan for.
   */
  fromAge?: TechAge;
  /**
   * Scale this effect by how many *tiles* of the resource the player controls,
   * rather than counting the kind once.
   *
   * **The deliberate exception to "uniqueness is the rule".** Silver and gold are
   * the only two rows that use it, and only in their Æra III tier: their whole
   * design is that a vein is worth finding a second one of, which is the exact
   * opposite of what every other luxury says. Marked here, in the data, and in
   * `docs/luxuries.md`, because a reader who has learnt the uniqueness rule will
   * otherwise be certain this is a bug.
   */
  perCopy?: boolean;
}

type Signature<T> = T & ResourceEffectModifiers;

/**
 * The whole signature-effect vocabulary: thirteen shapes, and each one earns its
 * place by being the smallest generic thing several ratified rows need.
 *
 * Kept deliberately small — a luxury table where every row could name an
 * arbitrary effect is a table where every row is a special case in the
 * simulation. The point is that ONE evaluator (`resourceEffects.ts`) reads all
 * of them: a new luxury with a familiar signature is a JSON row and nothing
 * else, and a new *shape* is a deliberate design decision with a place to be
 * argued about. Rows whose ratified effect would need a one-off hack are
 * **deferred and annotated** in `docs/luxuries.md` rather than bent into a shape
 * that nearly fits.
 *
 *   · `perCityYields`   flat yields in **every** city the empire holds — or in
 *                       every coastal one, or only in the city that owns the
 *                       seam (`scope`). The wide shape, and the one the ratified
 *                       table is built out of: "+2 gold per city" is a payoff
 *                       for breadth that happiness and authority then tax.
 *   · `perPopulationYields`  the same, multiplied by each city's population and
 *                       floored per city — olives' half a coin a head.
 *   · `empireYields`    flat yields to the whole empire, once per unique kind.
 *                       Food and production are rejected at load — the empire
 *                       has no basket for either, and an effect that silently
 *                       does nothing is worse than one that fails to load.
 *   · `extraHappiness`  on top of the flat `perUniqueLuxury` every luxury pays,
 *                       optionally *per city* or *per coastal city*.
 *   · `authoritySupply` flat authority capacity, optionally per city. The meter
 *                       prints it as its own line, beside the palace's.
 *   · `productionBonus` a percentage of hammers behind one *category* of thing a
 *                       city may be building, in the owning city or empire-wide.
 *   · `percentYields`   a percentage of one yield, empire-wide or in each
 *                       coastal city. Joins the **city stage** of Entry XVII's
 *                       two-stage pipeline whatever its scope — it applies in a
 *                       city — so it sums with the buildings' percentages and
 *                       the meter tiers multiply what the two come to.
 *   · `rulePercent`     a signed percentage on a named rule of the simulation —
 *                       what a citizen demands in happiness, what a border tile
 *                       costs, how much food a city keeps when it grows.
 *   · `happinessTierBoost`  raises the *positive* happiness tiers by so many
 *                       percentage points. Amber, and nothing else.
 *   · `improvementYields`  flat yields on **every hex of this empire carrying a
 *                       named improvement** — the ratified "fishing boats give
 *                       +1 culture" (tyrian) and "fishing boats gain +1
 *                       production" (whales, Æra III). The one shape that pays
 *                       into the *tile* chain rather than into a city's totals,
 *                       so it lands as an ordinary contribution line in
 *                       `explainTileYield` (hard rule 5) and the hover card, the
 *                       citizen's score and the banked total all learn it from
 *                       one place. It is scoped to the *empire* like every other
 *                       signature: the seam is held once, and every boat the
 *                       empire owns is better for it.
 *   · `buildingCategoryYields`  flat yields — and, optionally, happiness — **per
 *                       building of one `BuildingCategory`**, or per **wonder**
 *                       (`wonders: true`), that the empire holds. The 2026-09-02
 *                       round's one genuinely new reading, and the shape the
 *                       ledger refused when a single row wanted it: four rows
 *                       want it now (jade, tea, coffee, cotton) and marble wants
 *                       its wonder selector. The yields land **in the town
 *                       holding the building**, which is what makes it a payoff
 *                       for having built rather than for having spread; the
 *                       happiness is the empire's, because happiness always is.
 *   · `routeYields`     flat yields on **every trade route this empire is
 *                       running** — furs' Æra III coin a caravan. It joins
 *                       `explainRouteYieldBetween`'s own list (`routeYields.ts`)
 *                       rather than a city's totals, `improvementYields`' bargain
 *                       one ledger over: a route's figure is the fold of the
 *                       lines the destination's sheet prints.
 *   · `unitUpkeepRebate`  a flat number of gold off **each unit's own
 *                       maintenance**, floored at what that unit costs (salt).
 *                       It lands as a labelled line in `explainUnitUpkeepRebate`
 *                       (`upkeep.ts`), the same list a card's rebate lands in —
 *                       there is one give-back list on the payroll and this is
 *                       not a second subtraction under it.
 *   · `connectionPercent`  a signed percentage of what **the roads between this
 *                       empire's cities** pay it (spices, Æra III). Its own
 *                       shape rather than a fourth `rulePercent`, for two
 *                       reasons: `ResourceRule` has to stay a subset of
 *                       `CardRule` (see the note there), and what it takes a
 *                       share of is one *line* of `explainEmpireGold` — a figure
 *                       banked once for the empire, which never rides Entry
 *                       XVII's two city stages and must not be routed through
 *                       them. Applied and floored once, in `empireGold.ts`.
 *
 * Uniqueness is not part of the shape because it is part of the *reading*: an
 * empire effect counts once per kind however many seams feed it, and an
 * owner-scoped effect counts once per kind **per city**. Two jades in one city
 * are one jade's signature; two jades in two cities are two, because the effect
 * is the city's. `perCopy` is the one, marked, exception.
 */
export type ResourceEffect =
  | Signature<{ kind: 'perCityYields'; scope?: ResourceCityScope } & ResourceYieldBag>
  | Signature<{ kind: 'perPopulationYields'; scope?: ResourceCityScope } & ResourceYieldBag>
  | Signature<{ kind: 'empireYields' } & ResourceYieldBag>
  | Signature<{ kind: 'extraHappiness'; amount: number; per?: 'city' | 'coastalCity' }>
  | Signature<{ kind: 'authoritySupply'; amount: number; per?: 'city' }>
  | Signature<{
      kind: 'productionBonus';
      category: ProductionCategory;
      percent: number;
      /** `'city'` (the default) is the owning city; `'empire'` is every city. */
      scope?: 'city' | 'empire';
    }>
  | Signature<{
      kind: 'percentYields';
      yield: CityYieldKey;
      percent: number;
      scope?: ResourceCityScope;
    }>
  | Signature<{ kind: 'rulePercent'; rule: ResourceRule; percent: number }>
  | Signature<{ kind: 'happinessTierBoost'; points: number }>
  | Signature<{ kind: 'improvementYields'; improvement: ImprovementId } & ResourceYieldBag>
  | Signature<
      {
        kind: 'buildingCategoryYields';
        /** The shelf a building has to be on. Absent iff `wonders` is set. */
        category?: BuildingCategory;
        /** Count **wonders** instead of a category — marble's selector. */
        wonders?: true;
        /** Empire happiness per matching building, on top of the yields. */
        happiness?: number;
      } & ResourceYieldBag
    >
  | Signature<{ kind: 'routeYields' } & ResourceYieldBag>
  | Signature<{ kind: 'unitUpkeepRebate'; amount: number }>
  | Signature<{ kind: 'connectionPercent'; percent: number }>;

/** Every effect shape's tag, for the loader's validation and for tests. */
export const RESOURCE_EFFECT_KINDS: readonly ResourceEffect['kind'][] = [
  'perCityYields',
  'perPopulationYields',
  'empireYields',
  'extraHappiness',
  'authoritySupply',
  'productionBonus',
  'percentYields',
  'rulePercent',
  'happinessTierBoost',
  'improvementYields',
  'buildingCategoryYields',
  'routeYields',
  'unitUpkeepRebate',
  'connectionPercent',
];

/** Every rule a `rulePercent` may name. Validation, and the evaluator's switch. */
export const RESOURCE_RULES: readonly ResourceRule[] = [
  'happinessDemand',
  'borderCost',
  'growthCarryover',
];

/**
 * Every shelf a `buildingCategoryYields` may name.
 *
 * Written as an exhaustive `Record` and read back as its keys, rather than as a
 * hand-kept array, so that a category added to or renamed in `BuildingCategory`
 * (`buildingData.ts`) **fails to compile here** instead of quietly becoming a
 * word this validator would refuse. The import above stays type-only for the
 * reason `validateEffect` documents about `ImprovementId`.
 */
const BUILDING_CATEGORY_SET: Record<BuildingCategory, true> = {
  food: true,
  culture: true,
  science: true,
  production: true,
  military: true,
  gold: true,
  faith: true,
};

export const RESOURCE_BUILDING_CATEGORIES = Object.keys(
  BUILDING_CATEGORY_SET,
) as readonly BuildingCategory[];

/**
 * Every category a `productionBonus` may name — `ProductionCategory`'s three,
 * kept the same exhaustive way for the same reason. `wonder` joined the union
 * with the wonders framework and marble names it since 2026-09-02.
 */
const PRODUCTION_CATEGORY_SET: Record<ProductionCategory, true> = {
  unit: true,
  building: true,
  wonder: true,
};

const RESOURCE_PRODUCTION_CATEGORIES = Object.keys(
  PRODUCTION_CATEGORY_SET,
) as readonly ProductionCategory[];

/** The three voices a trade route pays. A `routeYields` bag may name no other. */
const ROUTE_YIELD_KEYS: readonly (keyof ResourceYieldBag)[] = ['food', 'production', 'gold'];

/**
 * Every yield a city banks, in the order surfaces print them — and the order
 * `cityYields` applies Entry XVII's two stages in, so a reader comparing the
 * panel's chips to the code walks them the same way round.
 */
export const CITY_YIELD_KEYS: readonly CityYieldKey[] = [
  'food',
  'production',
  'gold',
  'science',
  'culture',
  'faith',
];

/**
 * The yield names an effect bag may carry. The same six, because a bag pays what
 * a city banks — one list, so a seventh voice cannot arrive in only one of them.
 */
export const RESOURCE_EFFECT_YIELDS: readonly (keyof ResourceYieldBag)[] = CITY_YIELD_KEYS;

export interface ResourceDef {
  name: string;
  kind: ResourceKind;
  /** Added to the tile's terrain/feature/hills yield. See `tileYieldOf`. */
  yields: TileYieldSpec;
  /** Terrains this may sit on. See the constraint shape in the docblock. */
  validTerrain: TerrainId[];
  /** Features it may sit on, or absent for "any". */
  validFeatures?: FeatureId[];
  /** Required value of the tile's `hills` flag, or absent for "either". */
  hills?: boolean;
  /** Technology a player needs before they are *shown* this. */
  requiresTech?: TechId;
  /**
   * The signatures this luxury pays on top of the flat happiness, **in order**.
   *
   * A *list* since the ratified table landed, and that is the whole shape of the
   * design it encodes: a luxury is a base tier plus, at Æra III, a second one
   * (`fromAge`), and several rows pay two different things at the base tier
   * (gold pays into every city *and* raises the empire's happiness). Order is
   * the order every surface prints them in, so a row a designer reads top to
   * bottom is a hover a player reads top to bottom.
   *
   * Absent for every bonus and strategic row, and absent is lawful for a luxury
   * too — ivory ships that way, because its ratified effect is a unique unit and
   * unique units are a system this game does not have yet.
   */
  effects?: ResourceEffect[];
  /**
   * Player prose for the half of this row's ratified text that is **not in the
   * data at all** — the honest hole, named on the row rather than only in
   * `docs/luxuries.md`.
   *
   * `statecraftData.ts`' `deferred:` convention, and the same rule with it: a
   * shape is never bent to nearly fit. Plain words in a first-time player's
   * terms (hard rule 7), no identifiers and no numbers; the row's live effects
   * are what actually pays.
   */
  deferred?: string;
  /**
   * Display glyph for text surfaces (hover readout, panels). An emoji
   * placeholder for now; the lens roundels use the drawn SVG icons instead —
   * and fall back to *this* for a row nobody has drawn one for yet.
   */
  emoji: string;
  /** Relative weight in the placement draw. Not a count. */
  frequency: number;
  /**
   * This row is **never scattered on the surface** — it exists only under the
   * ground, and the one thing that ever puts it on a tile is a survey striking
   * a vein (`veins.ts`, `prospectAt` in `improvements.ts`).
   *
   * **Presence is the marker**, `charges`' and `consecrates`' convention: a
   * buried row is filtered out of the scatter's own table in `resources.ts`, so
   * the dice `placeResources` spends are the dice it spent before this field
   * existed and every surface map on every seed is bit-identical.
   *
   * Its `validTerrain` / `validFeatures` / `hills` are still honest and still
   * load-bearing — they are what `placeVeins` asks before it may seed one, so a
   * struck vein leaves the tile in a state the generator could have produced.
   * What it may *not* have is a `frequency`, which is why the table's
   * non-positive check excuses a buried row: a weight in a draw it is never in
   * would be a dial a designer turned expecting something to happen.
   */
  buried?: true;
  /** Inclusive `[min, max]` tiles one find spreads over. Absent means 1. */
  clusterSize?: [number, number];
}

export interface ResourceData {
  resources: Record<ResourceId, ResourceDef>;
}

/**
 * The live table, and the one door data comes in through.
 *
 * `let` rather than `const` for one reason and it is worth writing down: the
 * table is the *only* thing that decides what a resource is, and the way to
 * prove that is to be able to hand the simulation a row it has never seen and
 * watch it place, pay and explain (`withExtraResources`, and the test that uses
 * it). Nothing in the game ever reassigns it.
 */
const BASE_TABLE = (resourcesJson as unknown as ResourceData).resources;

export const RESOURCE_DATA: ResourceData = { resources: BASE_TABLE };

/**
 * Every resource id, in the order the table lists them. Iteration order — and
 * therefore part of every seeded outcome the scatter produces.
 *
 * A live binding rather than a snapshot: consumers `import { RESOURCE_IDS }`
 * and read it when they need it, so a scoped override is visible to all of them
 * at once.
 */
export let RESOURCE_IDS: readonly ResourceId[] = Object.keys(BASE_TABLE) as ResourceId[];

export function resourceDef(id: ResourceId): ResourceDef {
  const def = RESOURCE_DATA.resources[id];
  if (!def) throw new Error(`Unknown resource "${id}"`);
  return def;
}

/**
 * Runs `body` with extra rows installed in the table, then puts the table back
 * exactly as it was — including on the way out of a throw.
 *
 * This is a *proof obligation*, not a game mechanic. The claim this milestone
 * makes is that a resource is entirely data, and the honest way to hold that
 * claim still is a test that invents one at runtime and asserts the scatter
 * places it, the yield algebra pays it and the breakdown explains it, with no
 * TypeScript written for it. Nothing in `src/` calls this.
 */
export function withExtraResources<T>(
  rows: Readonly<Record<string, ResourceDef>>,
  body: () => T,
): T {
  const previousTable = RESOURCE_DATA.resources;
  const previousIds = RESOURCE_IDS;
  RESOURCE_DATA.resources = { ...previousTable, ...rows } as Record<ResourceId, ResourceDef>;
  RESOURCE_IDS = Object.keys(RESOURCE_DATA.resources) as ResourceId[];
  try {
    validateTable();
    return body();
  } finally {
    RESOURCE_DATA.resources = previousTable;
    RESOURCE_IDS = previousIds;
  }
}

/**
 * Runtime guard. A resource id can arrive from a save file or (eventually) a
 * socket, so a value typed `ResourceId` may be any string at all.
 */
export function isResourceId(value: unknown): value is ResourceId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(RESOURCE_DATA.resources, value)
  );
}

/**
 * What a resource adds to the tile it sits on.
 *
 * A fresh object every call, exactly as `tileYield` returns one: the table is
 * shared module state and a caller that summed into it would retune the game.
 */
export function resourceYield(id: ResourceId): TileYield {
  return readTileYield(resourceDef(id).yields);
}

/**
 * May this player be *told* this resource is here?
 *
 * The one implementation of the reveal gate, written as a pure function of the
 * technologies held so that it can live down here beside the table it reads.
 * `isResourceVisible` in `tech.ts` is a one-line delegate for the surfaces that
 * have a `GameState` in hand; `openedResource` and `explainTileYield` in
 * `cities.ts` call this directly — because *access* and the *yield* are gated on
 * the reveal too, and three copies of that rule is exactly what rule 5 forbids.
 */
export function resourceIsVisibleTo(id: ResourceId, techs: readonly TechId[]): boolean {
  const gate = resourceDef(id).requiresTech;
  return gate === undefined || techs.includes(gate);
}

/** Every resource of a kind, in table order. */
export function resourcesOfKind(kind: ResourceKind): ResourceId[] {
  return RESOURCE_IDS.filter((id) => resourceDef(id).kind === kind);
}

/**
 * The signatures of a resource, in table order, or an empty list.
 *
 * The one accessor: nothing outside `resourceEffects.ts` switches on a `kind`,
 * and nothing anywhere reads `def.effects` directly.
 */
export function resourceEffects(id: ResourceId): readonly ResourceEffect[] {
  return resourceDef(id).effects ?? [];
}

/**
 * Is this tier live for an empire standing in `age`?
 *
 * The whole of the `fromAge` gate, in one place, so the evaluator, the hover
 * that labels a locked tier and any test asking about the boundary all agree
 * about what "at Æra III" means: **at or past**, so an empire whose highest
 * technology is Age 3 has it, and one still in Age 2 does not.
 */
export function effectIsLive(effect: ResourceEffect, age: TechAge): boolean {
  return effect.fromAge === undefined || age >= effect.fromAge;
}

/** "Æra III" — how the interface names the age a locked tier is waiting for. */
export function ageLabel(age: TechAge): string {
  return `Æra ${eraNumeral(age)}`;
}

/**
 * True when this resource is one the *fairness* pass will plant near a start:
 * a bonus resource that actually feeds a city. See `resources.ts`.
 *
 * Asked of the data rather than hard-coded as a list of five ids, so a sixth
 * bonus food added to the table is covered the day it lands.
 */
export function isBonusFood(id: ResourceId): boolean {
  const def = resourceDef(id);
  return def.kind === 'bonus' && def.yields.food > 0;
}

/**
 * Fails loudly at load if the table names something that does not exist.
 *
 * The whole point of a data-driven table is that a designer edits it without
 * touching TypeScript, and the cost of that is that a typo in a terrain id
 * would otherwise show up as a resource that silently never places. A thrown
 * error at import is the cheapest possible version of that test, and
 * `test/resources.test.ts` asserts the same invariants from the outside.
 *
 * The effect block gets the same treatment for a sharper reason: an effect the
 * evaluator cannot read is an effect that pays *nothing*, and a luxury that
 * quietly pays nothing is the one bug this design could hide indefinitely.
 */
function validateEffect(where: string, effect: ResourceEffect): void {
  if (!RESOURCE_EFFECT_KINDS.includes(effect.kind)) {
    throw new Error(`${where} has unknown effect kind "${(effect as { kind: string }).kind}"`);
  }
  // The two modifiers, checked once for every shape because they belong to every
  // shape. An age outside the tree's own range is a tier that can never arrive,
  // which is the quiet-nothing this validator exists to refuse.
  const { fromAge } = effect;
  if (fromAge !== undefined) {
    if (!TECH_AGES.includes(fromAge)) {
      throw new Error(`${where} is gated on age ${fromAge}, which no technology has`);
    }
  }
  if (
    effect.kind === 'extraHappiness' ||
    effect.kind === 'authoritySupply' ||
    effect.kind === 'unitUpkeepRebate'
  ) {
    if (!Number.isFinite(effect.amount)) throw new Error(`${where} has a non-numeric amount`);
    return;
  }
  if (effect.kind === 'happinessTierBoost') {
    if (!Number.isFinite(effect.points)) throw new Error(`${where} has non-numeric points`);
    return;
  }
  if (effect.kind === 'productionBonus') {
    if (!RESOURCE_PRODUCTION_CATEGORIES.includes(effect.category)) {
      throw new Error(`${where} has unknown production category "${effect.category}"`);
    }
    if (!Number.isFinite(effect.percent)) throw new Error(`${where} has a non-numeric percent`);
    return;
  }
  if (effect.kind === 'buildingCategoryYields') {
    // **Exactly one selector.** A row that named both would be asking two
    // questions of one line ("production buildings, and also every wonder"), and
    // a row that named neither would count every building in the empire — which
    // is a shape nobody has ratified and which would read as a typo forever.
    const named = [effect.category !== undefined, effect.wonders === true].filter(Boolean).length;
    if (named !== 1) {
      throw new Error(`${where} must name exactly one of "category" or "wonders"`);
    }
    if (effect.category !== undefined && !RESOURCE_BUILDING_CATEGORIES.includes(effect.category)) {
      throw new Error(`${where} names unknown building category "${effect.category}"`);
    }
    if (effect.happiness !== undefined && !Number.isFinite(effect.happiness)) {
      throw new Error(`${where} has non-numeric happiness`);
    }
    // Falls through to the yield-bag check below, which is where "names nothing
    // at all" is refused — except that happiness alone is a lawful line here,
    // which is the one thing this shape adds to that reading.
  }
  if (effect.kind === 'percentYields') {
    if (!RESOURCE_EFFECT_YIELDS.includes(effect.yield)) {
      throw new Error(`${where} takes a percentage of unknown yield "${effect.yield}"`);
    }
    if (!Number.isFinite(effect.percent) || effect.percent === 0) {
      throw new Error(`${where} has a zero or non-numeric percent`);
    }
    return;
  }
  if (effect.kind === 'rulePercent') {
    if (!RESOURCE_RULES.includes(effect.rule)) {
      throw new Error(`${where} names unknown rule "${effect.rule}"`);
    }
    if (!Number.isFinite(effect.percent) || effect.percent === 0) {
      throw new Error(`${where} has a zero or non-numeric percent`);
    }
    return;
  }
  if (effect.kind === 'connectionPercent') {
    if (!Number.isFinite(effect.percent) || effect.percent === 0) {
      throw new Error(`${where} has a zero or non-numeric percent`);
    }
    return;
  }
  // `improvementYields` falls through to the yield-bag checks below like every
  // other bag shape. That the improvement it names is *real* is checked in
  // `improvementData.ts`'s own validator, which is the module that can see both
  // tables — this one may only import `ImprovementId` as a type, or the two
  // load-time validators would close a cycle and whichever ran second would read
  // an uninitialised binding. Same bargain `buildingData.ts` keeps with the tech
  // table, and for the same reason.
  //
  // Every yield shape, and the one asymmetry among them: the empire banks gold,
  // science, culture and faith and has nowhere to put food or hammers. The
  // per-city shapes *do* have somewhere to put them — a city is exactly the
  // thing with a food basket — which is half of why they are a separate kind.
  let named = 0;
  for (const key of RESOURCE_EFFECT_YIELDS) {
    const value = effect[key];
    if (value === undefined) continue;
    if (!Number.isFinite(value)) throw new Error(`${where} has a non-numeric ${key}`);
    if (effect.kind === 'empireYields' && (key === 'food' || key === 'production')) {
      throw new Error(`${where} pays empire ${key}, which no empire has a basket for`);
    }
    // A caravan carries three voices and a route line has three fields
    // (`RouteYieldLine`, `routeYields.ts`). A fourth on a `routeYields` bag would
    // load, pay nothing and say nothing — the quiet-nothing this validator is for.
    if (effect.kind === 'routeYields' && !ROUTE_YIELD_KEYS.includes(key)) {
      throw new Error(`${where} pays a route ${key}, which a route has no line for`);
    }
    named += 1;
  }
  // Happiness alone is a whole line for a `buildingCategoryYields` — jade pays
  // both, marble pays only culture, and a row that paid only contentment per
  // workshop would be perfectly lawful.
  if (effect.kind === 'buildingCategoryYields' && effect.happiness !== undefined) return;
  if (named === 0) throw new Error(`${where} names no yields at all`);
}

function validateTable(): void {
  const kinds: ResourceKind[] = ['bonus', 'strategic', 'luxury'];
  for (const id of RESOURCE_IDS) {
    const def = resourceDef(id);
    const where = `resources.json: ${id}`;
    if (!kinds.includes(def.kind)) throw new Error(`${where} has unknown kind "${def.kind}"`);
    if (def.validTerrain.length === 0) throw new Error(`${where} has no valid terrain`);
    for (const terrain of def.validTerrain) {
      if (!TERRAIN_IDS.includes(terrain)) throw new Error(`${where} names unknown terrain "${terrain}"`);
    }
    for (const feature of def.validFeatures ?? []) {
      if (!FEATURE_IDS.includes(feature)) throw new Error(`${where} names unknown feature "${feature}"`);
    }
    if (def.requiresTech !== undefined && !TECH_IDS.includes(def.requiresTech)) {
      throw new Error(`${where} names unknown technology "${def.requiresTech}"`);
    }
    // A **buried** row is never in the surface draw, so it has no weight to
    // give — see `ResourceDef.buried`. Everything else must have one, because a
    // zero-weight row in a table it *is* in is a row that can never be placed
    // and nothing would ever say so.
    if (!def.buried && def.frequency <= 0) {
      throw new Error(`${where} has a non-positive frequency`);
    }
    const cluster = def.clusterSize;
    if (cluster && (cluster[0] < 1 || cluster[1] < cluster[0])) {
      throw new Error(`${where} has a nonsensical clusterSize [${cluster[0]}, ${cluster[1]}]`);
    }
    for (const [index, effect] of (def.effects ?? []).entries()) {
      validateEffect(`${where} effect ${index}`, effect);
    }
  }
}

validateTable();
