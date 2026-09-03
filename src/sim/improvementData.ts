/**
 * Typed access to `data/improvements.json`.
 *
 * The fifth sibling of `terrainData.ts`, `unitData.ts`, `buildingData.ts` and
 * `resourceData.ts`: the JSON is the single source of truth for what an
 * improvement *is*, this file only types it and checks that the ids it names are
 * real. Nothing in the simulation hard-codes a yield, a terrain list or a charge
 * cost — a designer retunes the whole table by editing the JSON, and the
 * validator, the yield algebra, the production gate and the renderer all follow.
 *
 * Two kinds of improvement, one constraint shape
 * ----------------------------------------------
 * The shape is `resourceData.ts`'s plain **AND**, for the same reason: one rule
 * per row is a rule a designer can read off the row.
 *
 *     validTerrain     the tile's terrain must be in this list      (optional)
 *     validFeatures    the tile's feature must be in this list      (optional)
 *     requiresHills    the tile's `hills` flag must equal this      (optional)
 *     requiresResource the tile must carry one of these resources   (optional)
 *
 * with **three** seams in the AND, and every one of them *widens* a filter
 * rather than adding one: `freshwaterTerrain`, which widens `validTerrain` on
 * ground that can drink; `hillsIf`, which waives `requiresHills` on ground that
 * has a reason; and `adjacentImprovement`, which widens `validTerrain` on ground
 * whose *neighbour* gives it a reason. See the fields — the farm is the only
 * user of the first two and the reason both exist, and the floating gardens are
 * the third's.
 *
 * `requiresTech` sits beside them and is the one filter that is *not* about the
 * ground: it asks the worker's owner rather than the hex, which is why it is
 * documented on the field and not in this shape. Every improvement carries one
 * since the Age I rework, so the worker's menu now opens over the course of a
 * game instead of arriving whole on turn one.
 *
 * An absent filter means "don't care", and the kinds fall out of which
 * filters a row uses rather than out of a `kind` field nobody could get wrong:
 *
 *   · **generic** — farm and mine. They name terrain (and, for the mine, high
 *     ground) and no resource, so they may be built on bare ground.
 *   · **resource** — pasture, camp, quarry, plantation. They name a resource and
 *     nothing else, because the resource's own placement rules already pin the
 *     terrain: a camp is legal exactly where deer are, and restating "forest on
 *     grassland, plains or tundra" here would be a second copy of a rule that
 *     already exists in `resources.json` and could drift from it.
 *   · **feature** — the lumbermill, and it is the third kind for the second
 *     kind's reason read one field over. "Forest and jungle" (user, 2026-08-27)
 *     is the *whole* rule, so the row names `validFeatures` and nothing else:
 *     which terrains grow a canopy is mapgen's business, and a terrain list
 *     here would be a second copy of it. A feature list that names no bare
 *     ground is a constraint in its own right — every feature in the table is a
 *     land feature — which is what the load validator was widened to say. The
 *     lumbermill is also the one improvement that **works the thing standing on
 *     the tile**: it does not clear the trees, so `clearsClutter` is false and
 *     nothing anywhere writes `feature = 'none'` for it.
 *
 * Fishing boats are the one row that uses **both**, and deliberately: it names
 * its six sea resources *and* `validTerrain: ["coast"]`. That is not the
 * redundancy the paragraph above refuses — the terrain clause is what keeps the
 * row honest the day a sea resource is seeded on the deep ocean, since a worker
 * can only be standing on water it could embark onto (Entry XXVII) and coast is
 * all of that today. Read as one sentence off the row: "on a coastal seam, and
 * only on the coast".
 *
 * `improvesResource` is a different question from `requiresResource` and that is
 * why it is a different field. It is the list of resources this improvement
 * *unlocks access to* (`hasResource` in `cities.ts`, design ledger Entry IX's
 * correction), and for the four resource-improvements it is the same list they
 * are built on. The mine is why the two cannot be one field: a mine is buildable
 * on any hill and *also* the thing that opens an iron seam, so it names hills as
 * its constraint and iron and gems as what it improves.
 *
 * The sea, opened (Entry XXVII, 2026-08-26)
 * -----------------------------------------
 * **Fishing boats close the hole this docblock used to describe.** It said that
 * nothing wet had an improvement, that the six sea rows — fish and crabs, and
 * the four luxuries the ratified table added (pearls, coral, whales and tyrian
 * murex) — stayed on the map, stayed visible, paid a citizen who worked the
 * tile, and simply could not be *accessed* in the `hasResource` sense; and that
 * the four luxuries' happiness, per-city yields and both tiers of their
 * signatures were therefore written, tested and **inert**.
 *
 * All of it now fires, and the change really was the one row this file promised:
 * a `fishingBoats` entry gated on Sailing. Nothing in `openedResource`,
 * `resourceEffects.ts` or the meters knew the hole existed, which is why closing
 * it needed no edit in any of them. The *other* half of the same milestone is
 * why a worker can be standing there at all — civilian embarkation, in
 * `tileMoveCost` (`pathfind.ts`) — and the two are one feature: an improvement
 * on water that nobody can reach would have been the same hole with a row in it.
 * `docs/luxuries.md` records what came live per sea row.
 *
 * A deliberate hole, documented rather than papered over
 * ------------------------------------------------------
 * **Salt and jade are quarried, not mined**, which is where this table narrows
 * the design note (which said the mine's list carried salt). Both are placed
 * with no `hills` constraint, so roughly half of each sits on flat ground — and
 * a mine requires high ground. Filing them under the mine would have made every
 * flat salt pan and lowland jade seam permanently unimprovable, which is the
 * same "rule nobody could play against" the ledger refused for strategic
 * resources in Entry IX. The quarry has no terrain constraint of its own, so it
 * reaches both. Marble went the other way for the same reason read forwards: it
 * is hills-only, so the mine reaches all of it.
 *
 * Growth renewals are upgrades, not new rows (Entry I)
 * ---------------------------------------------------
 * `upgrades` is the punctuated-renewal hook: a list of `{tech, add,
 * requiresFreshwater?}` records, each of which becomes *its own contribution
 * entry* in `explainTileYield` (see `cities.ts`) once the tile's owner holds the
 * technology. Declarative data evaluated by one pipeline, exactly as Entry VIII
 * requires — so the tech screen can price a renewal before it is researched by
 * asking the same function the turn pipeline banks with. v0 wires one:
 * Feudalism gives freshwater farms a second point of food, the Civil Service
 * stand-in the growth-rhythm note asked for.
 *
 * The chop table: a sibling, not a seventh improvement
 * ---------------------------------------------------
 * Clearing a forest is the worker's other verb, and it lives in a `chop` block
 * beside `improvements` rather than as a row inside it. It is a sibling because
 * it is not the same *shape*: an improvement is a thing that goes **on** a tile
 * and pays every turn forever; a chop takes something **off** a tile and pays
 * once. Filing it as an improvement would have meant a row with a meaningless
 * `clearsClutter`, a `yields` that lied about being per-turn, and an
 * `improvementDef` whose callers all had to learn about the exception.
 *
 * One entry per feature, keyed by `FeatureId`, and an absent feature simply
 * cannot be cleared. Everything downstream reads the table generically: the
 * reducer's gate, the worker sheet's Chop row, and `techGifts` (which surfaces
 * *any* entry on whatever tech it names).
 *
 * **The jungle arrived on 2026-08-27 and cost exactly what this docblock
 * promised: one JSON object.** It said so as a prediction — "a jungle chop is
 * one data addition on the day it is designed rather than a code branch waiting
 * for it" — and the day came (user: "do we have a place in the tech tree where
 * we can chop jungle? That should probably be in bronzeworking") with no edit in
 * the gate, the sheet or the tech card: the row named `bronzeWorking` and the
 * node grew a "Clear Jungle" gift by itself. It pays the forest's twenty hammers
 * because nothing in the ratified table says otherwise, and it is homed a rung
 * later than the forest's Mining because a jungle is harder ground, not because
 * it is worth more.
 *
 * `yields` is a full `TileYieldSpec` for the family resemblance, and the load
 * validator holds it to **production only** — because production is the only
 * voice with a one-time bank to pay into (`City.hammerBasket`). Food and gold
 * have no basket, and a table that quietly promised them would be a number the
 * player was shown and never received. The day a food chop is designed it needs
 * somewhere to land, and that is a design decision, not a data edit.
 */

import improvementsJson from '../../data/improvements.json';

import { type Family, isFamily } from './greatPeopleData';
import { RESOURCE_IDS, type ResourceId, resourceEffects } from './resourceData';
import {
  FEATURE_IDS,
  type FeatureId,
  TERRAIN_IDS,
  type TerrainId,
  TILE_YIELD_KEYS,
  type TileYield,
  type TileYieldSpec,
  emptyTileYield,
  readTileYield,
} from './terrainData';
import { TECH_IDS, type TechId } from './techData';

export type ImprovementId =
  | 'farm'
  | 'mine'
  | 'pasture'
  | 'camp'
  | 'quarry'
  | 'fishingBoats'
  | 'plantation'
  | 'lumbermill'
  // Beds of reed and silt floated on still water — Raised Fields' own row (the
  // playtest notes, 2026-09-03). The first improvement that stands on water
  // without a seam under it: the fishing boat needs its fish, and this needs
  // only a lake, or a coast a boat is already working. See `adjacentImprovement`
  // for the half of that rule the ground cannot state by itself.
  | 'floatingGardens'
  // The five **great-person works** (`docs/great-people.md`). Ordinary rows in
  // every respect but one: `greatPerson` names the family whose piece plants
  // them, which is what a worker is refused by and what a great person is
  // offered. See the field.
  | 'academy'
  | 'landmark'
  | 'manufactory'
  | 'customsHouse'
  | 'citadel'
  // The **holy site** (`docs/religion-v2.md`), a work like the five above and
  // planted by a prophet rather than by a great person — which is what
  // `WorkFamily` is for. The strongest source of religious pressure there is,
  // and the one thing a rival can pillage to hurt a religion.
  | 'holySite';

/**
 * Who plants a work: one of the five **great-person families**, or the
 * **prophet**.
 *
 * `Family` widened by exactly one member rather than `Family` itself widened,
 * and the distinction is load-bearing: `Family` is the great-people roster's own
 * word — it keys `Player.renownByFamily`, it weights the draw and it names an
 * age's rows — while this is the answer to the narrower question *whose piece
 * lays this improvement down*. A prophet is bought with faith and is not a great
 * person at all, so a sixth `Family` would have opened a renown bucket nothing
 * ever feeds.
 *
 * Presence of `ImprovementDef.greatPerson` is still the marker for "this is a
 * work"; the value says which piece, and `workForFamily` inverts it.
 */
export type WorkFamily = Family | 'prophet';

/** Is this a family whose piece plants a work — one of the five, or the prophet? */
export function isWorkFamily(value: unknown): value is WorkFamily {
  return value === 'prophet' || isFamily(value);
}

/**
 * One tech-driven renewal of an improvement's yield.
 *
 * `add` is a yield delta and never a replacement, because a renewal is a thing
 * that arrives *on top of* what the tile already pays — and because an entry
 * that replaced would have to know what it was replacing, which is the inline
 * adjustment Entry VIII exists to forbid.
 */
export interface ImprovementUpgrade {
  /** The technology that switches this on for its owner. */
  tech: TechId;
  /** Added to the tile's yield once the owner holds `tech`. */
  add: TileYieldSpec;
  /**
   * When true the tile must also be able to drink (`Tile.freshwater`). Absent
   * means the renewal applies wherever the improvement stands.
   */
  requiresFreshwater?: boolean;
}

/**
 * One reason a row's `requiresHills` may be waived. See the field.
 *
 * A closed union rather than a free string, so a typo in the JSON is a load
 * error and not an exception that silently never fires.
 */
export type HillsWaiver = 'freshwater' | 'ownResource';

/** Every waiver word, for the load validator. Iteration order is the union's. */
export const HILLS_WAIVERS: readonly HillsWaiver[] = ['freshwater', 'ownResource'];

/**
 * The **third seam** in the constraint shape: terrains a row may *also* be built
 * on when a hex touching the tile already carries a named improvement.
 *
 * A widening, exactly like `freshwaterTerrain` and `hillsIf`, and it is a
 * widening for their reason: it never refuses ground `validTerrain` would take,
 * it only forgives ground the row asked not to be on when the neighbourhood
 * gives it a reason. Read as one sentence off the floating gardens' row — "on a
 * lake, and on any coast beside a fishing boat" (the playtest notes,
 * 2026-09-03).
 *
 * `improvement` is asked of the *table* rather than of a string in the
 * evaluator, so the day a second row wants a neighbour it names one here and
 * `improvementErrorAt` is not touched. The reach is the ring of six — the same
 * reach `hasAdjacentImprovement` (`statecraft.ts`) gives a town, one scale down
 * — and deliberately not the tile itself: two improvements never stand on one
 * hex, so "beside" is the only reading available.
 */
export interface AdjacentImprovement {
  /** The improvement a neighbouring hex must carry. */
  improvement: ImprovementId;
  /** Terrains this widens `validTerrain` by, on a hex with such a neighbour. */
  terrain: TerrainId[];
}

export interface ImprovementDef {
  name: string;
  /** Display glyph for text surfaces. An emoji placeholder, like a resource's. */
  emoji: string;
  /** Charges one build spends. The per-improvement half of the charge model. */
  chargeCost: number;
  /**
   * The technology a worker's owner must hold before this may be built at all,
   * or absent for "from turn one".
   *
   * The improvement half of the gate `unlocks.units` is for a unit, written from
   * *this* side rather than in `techs.json` for the reason `resourceData`'s
   * `requiresTech` is: an improvement is a row a designer tunes as a whole, and
   * a gate written two files away is a gate that drifts from the thing it gates.
   * `techGifts` inverts it so the tech screen can still say what a node hands
   * over, exactly as it does for a reveal.
   *
   * It gates the *build*, not the yield: an improvement already on the ground
   * when its tech is somehow absent (a captured tile, a hand-edited save) keeps
   * paying. `improvementErrorAt` is the only reader.
   */
  requiresTech?: TechId;
  /** Added to the tile's terrain/feature/hills/resource yield. Never replaces. */
  yields: TileYieldSpec;
  /** Terrains this may be built on, or absent for "any". See the docblock. */
  validTerrain?: TerrainId[];
  /**
   * Terrains this may **also** be built on when the tile can drink
   * (`hasFreshWater`), or absent for "fresh water changes nothing".
   *
   * The one place the constraint shape is not a plain AND, and it is a *union*
   * rather than a second filter for exactly that reason: it widens
   * `validTerrain` on watered ground instead of adding a clause every other row
   * would then have to opt out of. Read as one sentence off the farm's row —
   * "grassland and plains, and any flat desert, tundra or snow that can drink"
   * (user, 2026-08-26). Grassland and plains keep working dry, which is what
   * makes this a widening and not a new requirement.
   *
   * `requiresHills` is asked separately and still applies, which is what makes
   * "any **flat** tile with fresh water" the rule rather than "any tile".
   */
  freshwaterTerrain?: TerrainId[];
  /** Features it may be built on, or absent for "any". */
  validFeatures?: FeatureId[];
  /** Required value of the tile's `hills` flag, or absent for "either". */
  requiresHills?: boolean;
  /**
   * Reasons `requiresHills` may be **waived** on a tile, or absent for "the
   * flag is the rule".
   *
   * The second seam in the AND, and a *widening* like the first one: it never
   * refuses ground the row would otherwise take, it only forgives high ground a
   * row asked to be flat on (or, symmetrically, flat ground a row asked to be
   * high on — the shape does not care, and neither should a future row).
   *
   * The farm is why it exists (user, 2026-08-27): "farms can be built on hills
   * if adjacent to freshwater or there is a farmable resource on the tile. I see
   * a bug where I can't build a farm on a wheat-on-hills tile." Both halves of
   * that sentence are *reasons a hill is farmland* rather than facts about
   * farms, which is what makes them a list on the row instead of a clause in
   * `improvementErrorAt` that says the word "farm".
   *
   * The two reasons, and each is asked of the ground:
   *
   *   · `freshwater` — the tile can drink (`Tile.freshwater`, the same accessor
   *     `freshwaterTerrain` and the granary's water line ask). A terraced hill
   *     above a river is the oldest farm there is.
   *   · `ownResource` — the tile carries a resource **this** improvement opens
   *     (`improvementForResource`, the table's own inverse — never a list of
   *     names). Wheat on a hill wants a farm and can take no other improvement,
   *     so a rule that refused the farm made the seam unimprovable, which is the
   *     bug the user hit.
   */
  hillsIf?: HillsWaiver[];
  /**
   * Terrains this may **also** be built on when a neighbouring hex carries a
   * named improvement, or absent for "the neighbourhood changes nothing".
   *
   * The third seam in the AND. See `AdjacentImprovement`; the floating gardens
   * are the only user and the reason it exists.
   */
  adjacentImprovement?: AdjacentImprovement;
  /** Resources it may be built on, or absent for "bare ground is fine". */
  requiresResource?: ResourceId[];
  /** Resources this improvement grants *access* to. See the docblock. */
  improvesResource?: ResourceId[];
  /**
   * True when this improvement clears the generic scatter off its tile, the way
   * a resource prop does (see `addDecorations` in `board3d.ts`). A farm and a
   * mine work the ground itself and so replace what was growing on it; the four
   * resource-improvements are built *around* a resource whose props are the
   * tile's news, and they compose with them instead.
   */
  clearsClutter: boolean;
  /** Tech-driven renewals. See `ImprovementUpgrade` and the module docblock. */
  upgrades?: ImprovementUpgrade[];
  /**
   * The **family** whose great person plants this, or the field is **absent** on
   * everything a worker builds.
   *
   * Presence is the marker — `charges`' and `consecrates`' convention for the
   * third time — so nothing in `src/sim/` compares an improvement id against
   * `"academy"`, and a sixth work is a JSON row. The *value* is load-bearing
   * rather than decorative: it is the inverse of "which work does a scholar
   * plant", built once at load (`workForFamily`) exactly as
   * `improvementForResource` inverts `improvesResource`. A plain `true` would
   * have meant a second table mapping families to works, and two tables that
   * can disagree.
   *
   * The rule it carries is symmetric and lives in `improvementErrorAt`: a
   * builder may not lay a work, and a great person may lay nothing else.
   */
  greatPerson?: WorkFamily;
  /**
   * Flat strength this improvement adds to whoever defends the hex it stands
   * on, or absent for the ordinary improvement that adds none.
   *
   * The citadel's, and it is a *number the caller interprets* rather than a
   * behaviour anything switches on — `BuildingDef.cityStat`'s bargain one scale
   * down. `planCombat` folds it into the defender's breakdown as one more
   * labelled line beside the terrain, the trench and the cards, so a forecast
   * says "Citadel +8" rather than being quietly eight points harder.
   */
  defense?: number;
  /**
   * True when planting this claims the hex and its neighbours for the owner.
   *
   * The citadel's other half. `claimsClutter`'s neighbour in kind: a fact about
   * the *board* that follows from the improvement rather than from who built it,
   * so an AI that plants one takes the ground without knowing it should.
   */
  claimsNeighbours?: boolean;
  /**
   * Halves of this row's ratified design that the game **cannot do yet**, in a
   * first-time player's words and with no identifier in them.
   *
   * `CardDefBase.deferred`'s field a third table over (`buildingData.ts` carries
   * the second), and it keeps that field's whole bargain: a row whose design
   * outruns the machinery says so on its own card, struck through, rather than
   * being quietly bent into a shape that nearly fits. The floating gardens are
   * why it exists here — their lake clause is written, correct and inert,
   * because nothing may stand on a lake — and the Compendium prints it.
   */
  deferred?: string[];
}

/**
 * What clearing one feature costs and pays. See the module docblock for why this
 * is a table of its own rather than a seventh improvement.
 */
export interface ChopDef {
  /** The technology a worker's owner must hold before the axe swings at all. */
  tech: TechId;
  /** Charges one clearing spends. The same currency a build spends. */
  chargeCost: number;
  /**
   * Banked **once** into the owning city's `hammerBasket`. Production only —
   * the load validator says so, and the docblock says why.
   */
  yields: TileYieldSpec;
}

export interface ImprovementData {
  improvements: Record<ImprovementId, ImprovementDef>;
  /** Which features a worker may clear, and what each one pays. May be empty. */
  chop: Partial<Record<FeatureId, ChopDef>>;
  /** What the survey needs. See `ProspectDef`. */
  prospect: ProspectDef;
}

/**
 * The **survey**: what a worker or an explorer needs before it may ask a hill
 * what is under it (`prospectError` / `prospectAt` in `improvements.ts`).
 *
 * A sibling block beside `chop` rather than a row inside `improvements`, and for
 * `chop`'s own reason: a survey is not an improvement — nothing stands on the
 * tile afterwards, there is no yield to name, no terrain list and no charge —
 * and filing it as one would have meant six fields nobody could fill in.
 *
 * One field today, which is the honest size of it: the act costs the turn and
 * pays `rules.improvements.assayGold`, and both of those are already written
 * down somewhere a designer can find them. What lives here is the gate, so that
 * nothing in `src/sim/` spells a tech id into a verb.
 */
export interface ProspectDef {
  /** The technology that opens the act. */
  tech: TechId;
}

export const IMPROVEMENT_DATA: ImprovementData = improvementsJson as ImprovementData;

/** Every improvement id, in the order the JSON lists them. Iteration order. */
export const IMPROVEMENT_IDS = Object.keys(
  IMPROVEMENT_DATA.improvements,
) as ImprovementId[];

export function improvementDef(id: ImprovementId): ImprovementDef {
  return IMPROVEMENT_DATA.improvements[id];
}

/**
 * Runtime guard. An improvement id arrives inside a command, which may have come
 * from a save file or (eventually) a socket, so a value typed `ImprovementId`
 * may be any string at all.
 */
export function isImprovementId(value: unknown): value is ImprovementId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(IMPROVEMENT_DATA.improvements, value)
  );
}

/**
 * What an improvement adds to the tile it stands on, before any renewal.
 *
 * A fresh object every call, exactly as `tileYield` and `resourceYield` return
 * one: the table is shared module state and a caller that summed into it would
 * retune the game.
 */
export function improvementYield(id: ImprovementId): TileYield {
  return readTileYield(improvementDef(id).yields);
}

// --- clearing features ------------------------------------------------------

/**
 * Every feature a worker may clear, in the order the JSON lists them.
 *
 * An array rather than the object's keys read at each call site, for hard rule
 * 2's reason: this list is walked to build the worker's sheet and a technology's
 * gift list, and an iteration order that came out of a `Record` lookup would be
 * an ordering nobody wrote down.
 */
export const CHOPPABLE_FEATURES = Object.keys(IMPROVEMENT_DATA.chop) as FeatureId[];

/**
 * What clearing this feature costs and pays, or `null` when nothing clears it.
 *
 * `null` is the whole of "jungle is not choppable yet" and of "there is nothing
 * on this hex to clear" — one absence, read the same way by the gate, the sheet
 * and the tech card, so adding a feature to the table is the only edit that
 * teaching the game a new chop needs.
 */
export function chopDef(feature: FeatureId): ChopDef | null {
  return IMPROVEMENT_DATA.chop[feature] ?? null;
}

/** What the survey needs. See `ProspectDef` — one lookup, one gate. */
export function prospectDef(): ProspectDef {
  return IMPROVEMENT_DATA.prospect;
}

/**
 * What clearing this feature banks, as a full yield. A fresh object every call,
 * exactly as `improvementYield` returns one.
 */
export function chopYield(feature: FeatureId): TileYield {
  const def = chopDef(feature);
  return def ? readTileYield(def.yields) : emptyTileYield();
}

/**
 * The improvement that grants access to a resource, or `null` when none does.
 *
 * The inverse of `improvesResource`, built once at load from the table's own
 * order — the same trick `techData.ts` plays with `UNIT_UNLOCK_TECH`, and for
 * the same reason: the table is written forwards because that is how a designer
 * reads it, and the question the game asks ("what do I have to build on this
 * iron?") is the other way round. Inverting rather than duplicating is what
 * stops a resource being improved by one row and advertised by another.
 */
const RESOURCE_IMPROVEMENT = new Map<ResourceId, ImprovementId>();
for (const id of IMPROVEMENT_IDS) {
  for (const resource of IMPROVEMENT_DATA.improvements[id].improvesResource ?? []) {
    if (!RESOURCE_IMPROVEMENT.has(resource)) RESOURCE_IMPROVEMENT.set(resource, id);
  }
}

export function improvementForResource(resource: ResourceId): ImprovementId | null {
  return RESOURCE_IMPROVEMENT.get(resource) ?? null;
}

/**
 * The work each family plants, inverted from the rows at load — the same trick
 * `RESOURCE_IMPROVEMENT` plays one field over, and for its reason: the table is
 * written forwards because that is how a designer reads it, and the question the
 * game asks ("what does a scholar build?") is the other way round.
 *
 * The validator below refuses two works claiming one family, so this map is
 * total on whatever families the table actually serves and the lookup below is
 * the only reading of it.
 */
const FAMILY_WORK = new Map<WorkFamily, ImprovementId>();
for (const id of IMPROVEMENT_IDS) {
  const family = IMPROVEMENT_DATA.improvements[id].greatPerson;
  if (family !== undefined && !FAMILY_WORK.has(family)) FAMILY_WORK.set(family, id);
}

/** The improvement this family's great person plants, or `null` when none does. */
export function workForFamily(family: WorkFamily): ImprovementId | null {
  return FAMILY_WORK.get(family) ?? null;
}

/** Is this a great person's work — the one thing a worker may never build? */
export function isGreatPersonWork(id: ImprovementId): boolean {
  return improvementDef(id).greatPerson !== undefined;
}

/**
 * Fails loudly at load if the table names something that does not exist.
 *
 * The same cheapest-possible-test `resourceData.ts` runs, and for the same
 * reason: the whole point of a data-driven table is that a designer edits it
 * without touching TypeScript, and the cost of that is that a typo in a terrain
 * id would otherwise show up as an improvement that silently never validates.
 * `test/improvements.test.ts` asserts the same invariants from the outside.
 */
function validateTable(): void {
  for (const id of IMPROVEMENT_IDS) {
    const def = improvementDef(id);
    const where = `improvements.json: ${id}`;
    if (def.chargeCost <= 0) throw new Error(`${where} has a non-positive chargeCost`);
    for (const terrain of [...(def.validTerrain ?? []), ...(def.freshwaterTerrain ?? [])]) {
      if (!TERRAIN_IDS.includes(terrain)) {
        throw new Error(`${where} names unknown terrain "${terrain}"`);
      }
    }
    // A widening with nothing to widen is a row that means "any terrain, if it
    // can drink" while *looking* like a narrowing — the one reading of this
    // pair nobody could guess from the row.
    if (def.freshwaterTerrain !== undefined && def.validTerrain === undefined) {
      throw new Error(`${where} has freshwaterTerrain but no validTerrain to widen`);
    }
    for (const feature of def.validFeatures ?? []) {
      if (!FEATURE_IDS.includes(feature)) {
        throw new Error(`${where} names unknown feature "${feature}"`);
      }
    }
    for (const resource of [...(def.requiresResource ?? []), ...(def.improvesResource ?? [])]) {
      if (!RESOURCE_IDS.includes(resource)) {
        throw new Error(`${where} names unknown resource "${resource}"`);
      }
    }
    // A row that constrains nothing at all is buildable on the ocean floor,
    // which is not a rule anybody meant to write. Three lists can do the
    // constraining and a fourth kind of row is excused:
    //
    //   · `validTerrain`, the ordinary way;
    //   · `requiresResource`, which pins the ground through the resource's own
    //     placement rules;
    //   · `validFeatures` **naming no bare ground** — the lumbermill's. Every
    //     feature in the table grows on land, so a row that demands one has
    //     said "on land" as surely as a terrain list does. `'none'` is the
    //     exception that makes the clause need saying: it is not a feature, it
    //     is the absence of one, and a row admitting it has admitted open sea.
    //   · a **great person's work**, which constrains nothing on the ground by
    //     design: its planter is the constraint (`improvementErrorAt` refuses
    //     it water and impassable ground, and nothing else).
    const byFeature =
      def.validFeatures !== undefined &&
      def.validFeatures.length > 0 &&
      !def.validFeatures.includes('none');
    if (
      def.validTerrain === undefined &&
      def.requiresResource === undefined &&
      !byFeature &&
      def.greatPerson === undefined
    ) {
      throw new Error(`${where} constrains nothing: it needs validTerrain or requiresResource`);
    }
    // A waiver with nothing to waive is a row whose author meant something and
    // got nothing — the same reading `freshwaterTerrain` without `validTerrain`
    // gets, one field over.
    for (const waiver of def.hillsIf ?? []) {
      if (!HILLS_WAIVERS.includes(waiver)) {
        throw new Error(`${where} names unknown hills waiver "${String(waiver)}"`);
      }
    }
    if (def.hillsIf !== undefined && def.requiresHills === undefined) {
      throw new Error(`${where} has hillsIf but no requiresHills to waive`);
    }
    // The third seam, held to the two things it cannot get wrong. A widening
    // with nothing to widen reads as a *narrowing* while meaning the opposite —
    // the failure `freshwaterTerrain` is held to a few lines up — and a
    // neighbour nothing in the table can be is a rule that never fires.
    const neighbour = def.adjacentImprovement;
    if (neighbour !== undefined) {
      if (def.validTerrain === undefined) {
        throw new Error(`${where} has adjacentImprovement but no validTerrain to widen`);
      }
      if (!Object.prototype.hasOwnProperty.call(IMPROVEMENT_DATA.improvements, neighbour.improvement)) {
        throw new Error(
          `${where} wants a neighbouring "${String(neighbour.improvement)}", which is not an improvement`,
        );
      }
      if (neighbour.terrain.length === 0) {
        throw new Error(`${where} has an adjacentImprovement that widens nothing`);
      }
      for (const terrain of neighbour.terrain) {
        if (!TERRAIN_IDS.includes(terrain)) {
          throw new Error(`${where} names unknown terrain "${terrain}"`);
        }
      }
    }
    if (def.requiresTech !== undefined && !TECH_IDS.includes(def.requiresTech)) {
      throw new Error(`${where} needs unknown technology "${def.requiresTech}"`);
    }
    if (def.greatPerson !== undefined && !isWorkFamily(def.greatPerson)) {
      throw new Error(`${where} names unknown family "${String(def.greatPerson)}"`);
    }
    for (const upgrade of def.upgrades ?? []) {
      if (!TECH_IDS.includes(upgrade.tech)) {
        throw new Error(`${where} names unknown technology "${upgrade.tech}"`);
      }
    }
  }
  // The chop table, held to the four things a chop entry cannot get wrong. The
  // production-only clause is the interesting one: `City.hammerBasket` is the
  // only one-time bank in the game, so a chop that promised food would be a
  // number the sheet printed and the city never received.
  for (const feature of CHOPPABLE_FEATURES) {
    const def = chopDef(feature)!;
    const where = `improvements.json: chop.${feature}`;
    if (!FEATURE_IDS.includes(feature)) {
      throw new Error(`${where} is not a known feature`);
    }
    // "Clear nothing" is not a verb: `chopErrorAt` reads bare ground as *no*
    // entry, and a row here would make the absence mean two different things.
    if (feature === 'none') throw new Error(`${where} cannot clear bare ground`);
    if (def.chargeCost <= 0) throw new Error(`${where} has a non-positive chargeCost`);
    if (!TECH_IDS.includes(def.tech)) {
      throw new Error(`${where} needs unknown technology "${def.tech}"`);
    }
    const paid = readTileYield(def.yields);
    if (paid.production <= 0) throw new Error(`${where} pays no production`);
    for (const key of TILE_YIELD_KEYS) {
      if (key !== 'production' && paid[key] !== 0) {
        throw new Error(`${where} pays ${key}, which has no one-time bank to land in`);
      }
    }
  }
  // The other table's half of the same question, and it is here rather than in
  // `resourceData.ts` because this is the module that can see both: a luxury's
  // `improvementYields` signature names an improvement, and `resourceData` may
  // only import `ImprovementId` as a type (a value import back would close a
  // load-time cycle between two validators). A signature naming an improvement
  // that does not exist is a payoff that can never land on any hex.
  for (const resource of RESOURCE_IDS) {
    for (const effect of resourceEffects(resource)) {
      if (effect.kind !== 'improvementYields') continue;
      if (!isImprovementId(effect.improvement)) {
        throw new Error(
          `resources.json: ${resource} pays on unknown improvement "${String(effect.improvement)}"`,
        );
      }
    }
  }
  // Two works claiming one family would make "what does a scholar plant?" a
  // question with two answers, and `workForFamily` would silently keep the
  // first — the same failure `improvesResource` is held to below.
  const claimedBy = new Map<WorkFamily, ImprovementId>();
  for (const id of IMPROVEMENT_IDS) {
    const family = improvementDef(id).greatPerson;
    if (family === undefined) continue;
    const owner = claimedBy.get(family);
    if (owner !== undefined) {
      throw new Error(`improvements.json: ${family} is served by both ${owner} and ${id}`);
    }
    claimedBy.set(family, id);
  }
  // Two improvements claiming one resource would make "what do I build on this
  // iron?" a question with two answers, and `improvementForResource` would
  // silently keep the first.
  const claimed = new Map<ResourceId, ImprovementId>();
  for (const id of IMPROVEMENT_IDS) {
    for (const resource of improvementDef(id).improvesResource ?? []) {
      const owner = claimed.get(resource);
      if (owner !== undefined) {
        throw new Error(
          `improvements.json: ${resource} is improved by both ${owner} and ${id}`,
        );
      }
      claimed.set(resource, id);
    }
  }
}

validateTable();
