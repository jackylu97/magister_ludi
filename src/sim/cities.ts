/**
 * Everything a city *is*: territory, citizens, yields, growth, production and
 * borders.
 *
 * Pure logic over `GameState`. The end-of-turn phases in `turn.ts` are four
 * one-line calls into this module, and the `foundCity` / `setCityProduction`
 * commands validate in `commands.ts` and then call in here to do the work — so
 * the rules of a city live in one file, and the reducer stays a reducer.
 *
 * Nothing here rolls a die. A city's whole behaviour is a deterministic function
 * of the board, the rules and the player's queue, which is what lets a
 * thirty-turn replay come back byte-identical.
 *
 * Territory
 * ---------
 * A tile belongs to a *city*, not a player: `state.tileOwner[tileIndex]` holds a
 * city id (see the `state.ts` docblock for why it lives beside the map rather
 * than on it). A city claims its centre and the ring around it the moment it is
 * founded, then one tile at a time as culture accumulates. Claiming never takes
 * a tile from another city — the first city to reach a tile keeps it, and since
 * `expandBorders` walks `state.cities` in array order, "first" is a property of
 * the state and not of the wall clock.
 *
 * Citizens
 * --------
 * A city of population *n* works *n* tiles plus its own centre, which is free
 * and is not a citizen slot. Assignment is recomputed from scratch at the top of
 * every `collectYields` rather than being patched when something changes: pop,
 * borders and buildings can all move it, and recomputing is the only version
 * that cannot drift. The cost is O(cities × owned tiles) per turn — a few
 * hundred integer comparisons for a whole empire — and it buys the guarantee
 * that what the panel shows is what the yields were computed from.
 *
 * Scoring is `citizenWeights` dotted with the tile's yield, ties broken by tile
 * index. Both are deliberate: the weights are data a designer tunes, and the
 * tie-break makes the assignment a pure function of the board rather than of the
 * order `mapRange` happened to return tiles in.
 *
 * The same score picks the next border tile, which is not a coincidence — a city
 * should grow toward the land it would want to work.
 *
 * Baskets and overflow
 * --------------------
 * Food, hammers and culture all accumulate into baskets and all keep their
 * remainder when they pay for something. A city that banks 18 hammers into a
 * 15-hammer monument starts the next item with 3, and a city that grows carries
 * its surplus food into the next population point. Nothing is ever rounded away
 * on the player's behalf; the one exception is starvation, which empties the
 * food basket outright because a negative basket that survived would starve the
 * city again next turn for the same debt.
 */

import {
  BUILDING_IDS,
  type BuildingId,
  type CompletionGrant,
  type ProductionCategory,
  buildingDef,
  isBuildingId,
  isWonder,
} from './buildingData';
// The two sides of the lending rule (schema 57). `deals.ts` is a leaf — it
// imports `state.ts`, the resource table and the rule book and stops there — so
// the largest module in the simulation may read it without a shape of cycle.
import { lentAwayBy, lentToPlayer } from './deals';
import { discoveryKindTech } from './discoveryData';
import type { Hex } from './hex';
import {
  type GameMap,
  type Tile,
  getTileAt,
  mapRange,
  neighborTiles,
  tileHex,
  tileIndex,
  wrappedDistance,
} from './map';
import {
  type ImprovementId,
  improvementDef,
  improvementForResource,
  improvementYield,
  isGreatPersonWork,
} from './improvementData';
import {
  type ModifierStage,
  type StageSums,
  applyStages,
  foldStages,
  withStage,
} from './modifiers';
import { type Cell, type MoveProfile, findPath, isPassable, moveProfile, tileMoveCost } from './pathfind';
import {
  CITY_YIELD_KEYS,
  RESOURCE_IDS,
  type CityYieldKey,
  type ResourceId,
  type ResourceKind,
  resourceDef,
  resourceIsVisibleTo,
  resourceYield,
} from './resourceData';
import { type ProjectId, isProjectId, projectDef, projectFinishes } from './projectData';
import { type CardId, governmentDef } from './statecraftData';
import { isBeadEndeavourId } from './beadData';
import { CONSECRATION_IDS, type ConsecrationId, consecrationDef } from './religionData';
import { nextInt } from './rng';
import { anyBeadDef } from './beadData';
// The great-person draft a completion grant opens. This module and
// `greatPeople.ts` already sit on one runtime cycle (`cities` → `beads` →
// `greatPeople` → `cities`), so the direct edge adds no new one; the call is
// inside a function body, which is what keeps a cycle harmless.
import { drawGreatPersonOffer } from './greatPeople';
import { awardBeadGrant, claimEndeavour, closeTheGreatWork } from './beads';
import { settleRenownWindfall } from './renown';
import { type CitizenWeights, RULES } from './rulesData';
import {
  type CardYieldLine,
  type RateReading,
  type TileLine,
  cardActionRule,
  cardMeterFlag,
  cardCityYields,
  cardEmpireYields,
  cardFoundingRider,
  cardPercentYields,
  cardProduction,
  cardRulePercent,
  cardTileLines,
  consecrationCardTileLines,
  followerCardTileLines,
  cardProjectPays,
  drawDoctrineOffer,
  scopedCardTileLines,
  timedCityTileLines,
  foldCardRulePercent,
  foldCardYields,
  heldReligions,
  payWindfallGrants,
  settleCultureWindfall,
  tileConditionHolds,
  windfallPayout,
} from './statecraft';
import {
  type City,
  type GameState,
  type Player,
  type QueueItem,
  type Unit,
  capitalCityOf,
  cityById,
  cityReligion,
  claimWonder,
  createCity,
  createUnit,
  playerById,
  removeUnit,
  shrinkFollowers,
  tileOwnerField,
  wonderClaim,
} from './state';
// **Re-exported, not re-implemented.** `capitalCityOf` and `tileOwnerField` are
// pure readings of `state.cities` and `state.tileOwner`, so they moved beside
// `cityById` in `state.ts` (2026-08-28) to make `empireGold.ts`' flood fill a
// leaf. They are still *this* module's address for every caller that already
// asks it — a change of home, not of address.
export { capitalCityOf, tileOwnerField } from './state';
export type { TileOwnerField } from './state';
// Type-only, exactly as `barbarians.ts` takes it: `turn.ts` imports this module
// for its phases, so a *value* import back would close a load-time cycle. The
// pipeline's report is a type this module writes into and never constructs.
import type { TurnReport } from './turn';
import {
  TERRAIN_DATA,
  TILE_YIELD_KEYS,
  type TileYield,
  emptyTileYield,
  featureDef,
  isWaterTerrain,
  isWorkableTerrain,
  readTileYield,
  terrainDef,
} from './terrainData';
import {
  TECH_IDS,
  type TechId,
  UNIT_UNLOCK_TECH,
  eraNumeral,
  isTechId,
  techDef,
} from './techData';
// **A function-level cycle, and the mirror of one that already existed**:
// `tech.ts` asks this module what a city yields, and since the wonders' roster
// this module asks `tech.ts` what an empire may build (the Statue of Zeus' best
// melee) and finishes a technology outright (the Great Library's). Everything at
// the top level of both files is a constant from a data table, which is the
// condition the whole simulation's cycles are safe under — see the docblock in
// `statecraft.ts`.
import { buildError, settleResearchWindfall } from './tech';
import { UNIT_TYPE_IDS, type UnitTypeId, isNaval, isUnitTypeId, unitDef } from './unitData';
import { hasStackingRoom } from './units';
import { recomputeVisibility } from './visibility';
import { isCoastal } from './water';
import {
  type MeterId,
  borderFactor,
  borderPercent,
  bordersFrozen,
  growthPercent,
  meterEffects,
} from './meters';
import {
  cityResourceYields,
  empireResourceYields,
  foldResourceYields,
  foldRulePercent,
  resourcePercentYields,
  resourceProduction,
  resourceRulePercent,
  resourceTileLines,
} from './resourceEffects';
import { buildingTileLines } from './buildingEffects';
// A leaf, like `roads.ts` and `routeYields.ts`, and imported for the same
// reason: `guilds.ts` needs these answers too and must be free to import this
// file. See `specialists.ts`.
import { citySpecialistYields, totalSpecialists } from './specialists';
// **This file no longer imports `trade.ts`, and that is a rule** (2026-08-28).
// It used to, for the three readers below, while `trade.ts` imported this file
// back for the capital, the tile owner and the windfall settlements — a
// load-time cycle between the two largest modules in the simulation, which
// surfaced once as a `tileYieldOf is not a function` at test load and would have
// surfaced in a browser next. The three readers now live on the far side of
// nothing: `routeYields.ts` and `empireGold.ts` import neither this module nor
// `trade.ts`, `trade.ts` re-exports them so no screen changed its import, and
// `test/sim/cities.test.ts` reads this source and fails if `./trade` comes back.
import { cityRouteYields } from './routeYields';
import { empireGold, explainEmpireGold } from './empireGold';
// **A leaf, deliberately** (2026-08-28): the road writer and the roster's
// caravan both moved out of `trade.ts` so that this file's *founding* verb — The
// Founders' Road — reaches them without crossing the cycle it once documented.
import { layRoad } from './roads';
import { caravanTypeId } from './unitData';
import { awardFoundingTriumphs, awardOccasion } from './triumphs';
import { disbandCandidate, treasuryInDebt } from './upkeep';

const CITIES = RULES.cities;

/**
 * Everything a city produces in one turn.
 *
 * Six voices since the luxuries pass. `faith` is **accumulate-only**: cities
 * bank it into `Player.faithPool` and nothing in the game spends it yet — see
 * that field's docblock for why a half-system is the honest thing to ship.
 */
export interface CityYields {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

/** A city yield of nothing at all. The identity every sum here starts from. */
export function emptyCityYields(): CityYields {
  return { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
}

// --- tiles ------------------------------------------------------------------

/**
 * What a tile pays, and *why* — CLAUDE.md's hard rule 5 made a function.
 *
 * `explainTileYield` returns an ordered list of contributions and `tileYieldOf`
 * is the fold of that list. There is deliberately no second implementation: a
 * total computed beside the breakdown is a total that can disagree with the
 * explanation the interface prints, and the whole of Entry VIII is that a
 * preview cannot be allowed to lie.
 *
 * The order is the order the rules resolve in, and it is the one order this
 * chain is ever read in:
 *
 *     terrain base  →  feature override  →  hills override
 *                   →  resource add  →  improvement add  →  renewal adds
 *
 * Two kinds of entry and the fold treats them differently, which is what lets
 * one list carry two different algebras (see `terrainData.ts`, which has three):
 *
 *   `base` / `override`  **replace** the running total. That is Civ's rule for
 *                        the ground itself — a hill is a hill whatever grows on
 *                        it — and writing the feature down *even when a hill
 *                        overrides it* is the point: "Forest 1🌾1⚙, replaced by
 *                        Hills 0🌾2⚙" is the sentence a player needs, and the
 *                        fold reaches the same number either way.
 *   `add`                **sums**. A resource, an improvement and a renewal are
 *                        all things sitting *on* the ground rather than a
 *                        different kind of ground, which is what makes wheat
 *                        worth the same point of food wherever it lands.
 *
 * Workability is a separate question and is not touched here: a mountain with a
 * resource on it would still be unworkable, which is why `isWorkableTile` asks
 * the terrain and not the yield.
 *
 * The context, and who passes one
 * -------------------------------
 * Everything above the resource is a fact about the *tile*. The resource line
 * and the renewals are facts about the tile **and its owner** — Feudalism gives
 * freshwater farms a second food, and only to the empire that researched it —
 * so they need a player, and a function that took a whole `GameState` would drag
 * this module into an import cycle with `tech.ts` (which already depends on it).
 * `TileYieldContext` is therefore the minimum the evaluation actually needs: the
 * technologies held.
 *
 * `explainTileYield(tile)` with no context is the **omniscient** answer: every
 * line the ground could ever pay, to nobody in particular. That is the right
 * call for anything asking about *ground* rather than about an empire — the
 * mapgen page's start scorer, a report over a board with no players on it — and
 * it is emphatically the wrong call for a tile somebody owns. Who passes what is
 * written down in the `yieldContextFor` docblock, because a call site that
 * quietly stopped passing one would over-report a hidden seam and under-report a
 * renewal, and nothing would fail.
 *
 * The reveal gate
 * ---------------
 * A resource pays **only an empire that can be told it is there**
 * (`resourceIsVisibleTo`, the same rule `isResourceVisible` and `openedResource`
 * ask). Iron in the ground is worth nothing to a people with no word for iron;
 * the turn Bronze Working lands, the hammer appears — in the breakdown, in the
 * citizen's score, in the city panel and on the tile's own props, all together,
 * because all four derive from this one line rather than from a flag anybody has
 * to remember to set.
 *
 * This reverses the v1 reading, which paid the yield and hid only the *label* on
 * the grounds that a hidden number would be a lie the panel has to keep telling.
 * The ratified reading is that the number was the lie: a player who cannot see
 * why a hill is worth three hammers cannot plan around it, and "the tile got
 * better the moment you learnt what was on it" is the sentence a discovery is
 * supposed to earn. Nothing is stored and no flag is set — the reveal is derived
 * every time the yield is asked, exactly as `openedResource`'s first clause is.
 */
export type TileYieldKind = 'base' | 'override' | 'add';

export interface TileYieldContribution extends TileYield {
  /** Display label: the terrain, the feature, the resource, the tech. */
  source: string;
  kind: TileYieldKind;
}

/**
 * What an evaluation needs to know about the player whose tile this is.
 *
 * Deliberately not a `Player` and not a `GameState`: the only player-dependent
 * term in the whole chain is "does this empire hold the technology", so that is
 * the only thing the context carries. Anything richer would be a second reason
 * for this module to know about research.
 */
export interface TileYieldContext {
  /** Technologies the owning player holds. `Player.techsResearched`. */
  techs: readonly TechId[];
  /**
   * What this empire's **law, holdings and works** pay on a hex, already
   * resolved into `{ source, condition, bag }` lines (`TileLine` in
   * `statecraft.ts`).
   *
   * The *answer* rather than the question, and that is what keeps this chain
   * what it is: `explainTileYield` knows about a tile and a context and nothing
   * else — no `GameState`, no player id, no card table — so a line has to arrive
   * pre-resolved or the whole module would have to grow a second reason to know
   * about empires. Absent for a context-less (omniscient) evaluation and for an
   * empire whose law, holdings and works say nothing about ground, which is most
   * of them.
   *
   * **One list, five producers**, and the chain cannot tell them apart:
   *
   *   · a Statecraft card's **unscoped** `tileYield` (`cardTileLines`) — the
   *     empire's law, worth the same on every hex it owns;
   *   · a luxury's `improvementYields` (`resourceTileLines`) — what a held seam
   *     is worth to every hex of a kind, tyrian's boats and whales';
   *   · a building's `tileYields` (`buildingTileLines`) — the granary's food on
   *     water, and the first of them that is a fact about *one city*, which is
   *     why `cityContext` adds it and `yieldContextFor` cannot;
   *   · a card's **scoped** `tileYield` (`scopedCardTileLines`) — Petra's desert
   *     and the Hanging Gardens' irrigated farms, which are the same fact about
   *     one city said by a card instead of by a building;
   *   · a **follower belief's** `tileYield` (`followerCardTileLines`) — Harvest
   *     Blessing's food on the farms of a city that follows, and the only
   *     producer whose card may belong to another empire entirely;
   *   · a **consecration's** `tileYield` (`consecrationCardTileLines`) — the
   *     Green Cathedral's faith on the wild ground of the town whose cathedral
   *     was dedicated to the old gods.
   *
   * A seventh producer joins by appending to this list. It was `cards` alone
   * until Entry XXVII; folding the other two into the same channel rather than
   * giving each its own field is what keeps `explainTileYield`'s last clause one
   * loop instead of three.
   */
  lines?: readonly TileLine[];
}

/**
 * The context for a player, or `undefined` when there is no such player.
 *
 * **The call-site register**, kept here because a list of who passes a context
 * is only useful where somebody will read it. Two technologies now ride on it —
 * the renewals and the reveal gate (see `explainTileYield`) — so the rule for
 * new call sites is one line: **an owned tile is always evaluated with its
 * owner's context.** A tile nobody owns, and no seat is asking on behalf of, is
 * the only thing that may go without.
 *
 *   · `assignCitizens`, `centreYield`, `cityYields`, `bestExpansionTile` — all
 *     pass the *city owner's* context, through `cityContext`. Those four are the
 *     simulation banking and spending real yields: a citizen that ignored a
 *     renewal would be sent to the wrong tile the turn Feudalism landed, and one
 *     that counted an unrevealed seam would be sent to a hill that pays nothing.
 *   · the hover readout (`tileReadout.ts`) prices through `tileContextAt`:
 *     inside a city's territory, that CITY's own context (so a lighthouse's
 *     food on water prints where the citizen is paid — 2026-09-03); on wild
 *     ground, the **local seat's** context, because the question is "what
 *     would a city of mine collect here" — and a hover card that priced ore
 *     the seat cannot name would give away what the reveal gate hides.
 *   · the yield glyphs (`lens3d.ts`) pass `LensView.playerId`, the seat the lens
 *     is drawn for, so the board and the hover card agree.
 *   · the improvement preview (`improvementYieldDelta`) takes an optional one
 *     and the unit sheet (`controls.ts`) passes the **builder's owner**, so the
 *     "+1⚙" on a Mine row is what that empire would actually get. It is the
 *     same evaluator twice with and without the candidate, so the gate cancels
 *     out of the *delta* — which is the honest answer either way, and the reason
 *     the argument is still optional.
 *   · the citizen *score* used by the border chooser and the assigner is the
 *     fold of the same contextual list, so "grow toward land you would work"
 *     survives a renewal and does not chase a seam nobody has heard of.
 *   · **Deliberately context-less**, and the whole of that list: the start-site
 *     scorer (`startPositions.ts`), which runs during generation before any
 *     player has a technology or a tile, and tests asking about bare ground.
 *     Both are the omniscient reading, which is what "no context" means.
 */
export function yieldContextFor(
  state: GameState,
  playerId: number,
): TileYieldContext | undefined {
  const player = playerById(state, playerId);
  if (!player) return undefined;
  const ctx: TileYieldContext = { techs: player.techsResearched };
  // Written only when there is something in it, so an empire whose law and
  // holdings say nothing about ground builds a context byte-identical to the one
  // this returned before Statecraft existed — and a sweep of twenty hexes asks
  // both tables once, here, rather than once per tile.
  const lines = [...cardTileLines(state, playerId), ...resourceTileLines(state, playerId)];
  if (lines.length > 0) ctx.lines = lines;
  return ctx;
}

/**
 * The context of the player who owns a city, **plus what that city's own
 * buildings pay on its ground**. Never undefined in practice.
 *
 * The one place the two scales meet. Everything `yieldContextFor` resolves is a
 * fact about the *empire* and is the same in every town; a granary is a fact
 * about *this* town, so it can only be added by whoever has a city in hand — and
 * that is exactly the four callers in the register that pass a city's context
 * (`assignCitizens`, `centreYield`, `cityYields`, `bestExpansionTile`). A hex
 * outside anybody's borders has no granary to ask about, which is why the empire
 * context is the honest answer for the hover card and the lens.
 */
function cityContext(state: GameState, city: City): TileYieldContext | undefined {
  const ctx = yieldContextFor(state, city.ownerId);
  if (!ctx) return undefined;
  // Five producers are facts about *this town* rather than about the empire,
  // and none can be added by anybody without a city in hand: its buildings' tile
  // lines (the granary's food on water, Entry XXVII), its **live rites** (Rite
  // of Plenty's gold on its own worked seams, Entry XXVIII), the **scoped**
  // card lines (Petra's desert, the Hanging Gardens' irrigated farms — a
  // `tileYield` whose `scope` names which towns it lands in), and the **faith
  // this town follows** (Harvest Blessing's food on the farms of a following
  // city — the 2026-08-28 ruling, and the one producer whose card belongs to
  // somebody else's empire), and its **consecration** (the Green Cathedral's
  // faith and culture on wild ground — a fact about one cathedral in one town).
  // Appended in that order, and the tile chain still cannot tell any producer
  // from another.
  const own = [
    ...buildingTileLines(city, ctx.techs),
    ...timedCityTileLines(state, city),
    ...scopedCardTileLines(state, city),
    ...followerCardTileLines(state, city),
    ...consecrationCardTileLines(state, city),
  ];
  if (own.length === 0) return ctx;
  return { ...ctx, lines: [...(ctx.lines ?? []), ...own] };
}

/**
 * The ordered breakdown of one tile's yield. See the docblock above for the
 * order and for what each `kind` means to the fold.
 */
export function explainTileYield(
  tile: Tile,
  ctx?: TileYieldContext,
): TileYieldContribution[] {
  const list: TileYieldContribution[] = [];

  const terrain = terrainDef(tile.terrain);
  list.push({ source: terrain.name, kind: 'base', ...readTileYield(terrain.yield) });

  // **The hill first, the canopy over it** (user, 2026-08-27: "if jungle or
  // forest is on a hills tile, the jungle/forest yield should take precedence").
  //
  // Two overrides can land on one hex and only the *last* one written survives
  // the fold, so their order is the rule and not a detail of this loop. The
  // canopy wins because it is the more specific fact about what a citizen
  // actually does there: a forested hill is worked by foresters, and the hill's
  // own 0🌾/2⚙ was quietly turning every jungle hill into a mine. The hills line
  // is still written down — it is about to be overridden, the fold reaches the
  // same number either way, and the *list* is the explanation of why.
  if (tile.hills) {
    const hills = TERRAIN_DATA.hills;
    list.push({ source: hills.name, kind: 'override', ...readTileYield(hills.yieldOverride) });
  }

  const feature = featureDef(tile.feature);
  const override = feature.yieldOverride;
  if (override !== null) {
    list.push({ source: feature.name, kind: 'override', ...readTileYield(override) });
  }

  // The resource, and only for an empire that has a word for it. A seam this
  // player cannot be *told* about pays nothing — see "The reveal gate" above —
  // and a context-less evaluation is the omniscient one, which is why the test
  // is on `ctx` rather than on a player id that might be missing.
  if (tile.resource !== undefined && (!ctx || resourceIsVisibleTo(tile.resource, ctx.techs))) {
    list.push({
      source: resourceDef(tile.resource).name,
      kind: 'add',
      ...resourceYield(tile.resource),
    });
  }

  const improvement = tile.improvement;
  // Where the works' own entries begin, so a card that raises *them* by a
  // percentage can be paid off exactly what they pay and nothing else. See the
  // percentage pass at the foot of this function.
  const worksFrom = list.length;
  if (improvement !== undefined) {
    const def = improvementDef(improvement);
    list.push({ source: def.name, kind: 'add', ...improvementYield(improvement) });
    // The renewals, each its own entry, and only for an empire that has earned
    // them. Walked in the table's own order so two renewals on one improvement
    // always read in the same order (design ledger, Entry I).
    for (const upgrade of def.upgrades ?? []) {
      if (!ctx || !ctx.techs.includes(upgrade.tech)) continue;
      if (upgrade.requiresFreshwater && !tile.freshwater) continue;
      list.push({
        source: techDef(upgrade.tech).name,
        kind: 'add',
        ...readTileYield(upgrade.add),
      });
    }
  }
  const worksTo = list.length;

  // **What the hex has been reckoned to pay so far**, for the one condition that
  // asks about worth rather than about substance (`TileCondition`'s `yields`,
  // The Gilded Court's hexes that yield gold). It is the fold of the entries
  // above — the ground, the seam, the works — through the *one* fold there is,
  // so "yields gold" means here exactly what the hover card says the hex pays
  // and no second reading of the ground comes into existence (rule 5).
  //
  // Computed **lazily and once**: this function is asked millions of times a
  // turn and the overwhelming majority of games hold no card that asks, so the
  // reading is taken on the first condition that wants it and never otherwise.
  let paid: TileYield | undefined;
  const paidSoFar = (): TileYield => (paid ??= foldTileYield(list));

  // The empire's law, holdings and works, last, and as ordinary `add` entries:
  // Common Granary's food on a resource hex, a granary's food on water, tyrian's
  // culture on a fishing boat — each a line in this breakdown exactly as the
  // improvement's is, so the hover card, the citizen's score, the city panel and
  // the banked total all learn about them from one place (rule 5). Nothing here
  // asks *which* of the three a line came from — the context already resolved
  // that, and that is the whole reason there is one list rather than three.
  //
  // One card can speak twice about one hex — Winter Mother pays +1 food on any
  // tundra tile *and* +1 faith on a wooded one, so a tundra forest satisfies
  // both of her `tileYield` lines. The player reads one name and expects one
  // line under it, so lines that share a `source` are merged into a single
  // entry, summed, at the position of that source's **first** appearance —
  // order of first appearance in `ctx.lines`, the same determinism rule as
  // everywhere else in this fold. `sourceIndex` is only an index back into
  // `list`; nothing ever iterates it for output, so a `Map`'s own iteration
  // order never governs an outcome. `TileYieldContribution` carries no `on` /
  // condition field for display — only `source` names the line — so a merge of
  // lines with different conditions loses nothing: there was never a condition
  // to pick between in the first place.
  const sourceIndex = new Map<string, number>();
  for (const line of ctx?.lines ?? []) {
    if (!tileConditionHolds(tile, line.on, paidSoFar)) continue;
    // A line that is **only** a percentage carries no bag at all (The
    // Commonwealth's works). It is paid by the pass at the foot of this
    // function, and a zero-in-every-voice entry pushed here would be a row in
    // the hover that explains nothing — the same reading `paysSomething` takes
    // of a card's city yields one ledger over.
    if (!TILE_YIELD_KEYS.some((voice) => line[voice] !== 0)) continue;
    const existingAt = sourceIndex.get(line.source);
    if (existingAt !== undefined) {
      const merged = list[existingAt];
      merged.food += line.food;
      merged.production += line.production;
      merged.gold += line.gold;
      merged.science += line.science;
      merged.culture += line.culture;
      merged.faith += line.faith;
      continue;
    }
    sourceIndex.set(line.source, list.length);
    list.push({
      source: line.source,
      kind: 'add',
      food: line.food,
      production: line.production,
      gold: line.gold,
      science: line.science,
      culture: line.culture,
      faith: line.faith,
    });
  }

  // **A percentage on the works, and on nothing else** — The Commonwealth's half
  // again on a great person's academy. Last, so the figure it is a share of is
  // whole, and taken off the *improvement's own* entries (`worksFrom` …
  // `worksTo`: the improvement and its renewals) rather than off the hex's
  // total: a card that said "this hex pays half again" would be silently
  // multiplying the terrain, the river, the resource and whatever a second card
  // had already added. It joins as one more labelled `add`, so the breakdown
  // still sums to the total and a player can see which half was raised.
  //
  // Riders **sum before one multiplication** and the result is floored per
  // voice, which is Entry XVII's discipline read at the scale of a hex: two
  // cards that each say +50% are worth +100% rather than ×2.25.
  //
  // **And a percentage on the ground, which is its opposite number** — The Old
  // Ways' doubling of what an unimproved hex pays (`TileLine.basePercent`). It
  // is taken off the entries *before* the works (`0` … `worksFrom`: the terrain,
  // the hill or canopy over it, and the seam in it) through `foldTileYield`,
  // which is the one place a `base`/`override` list becomes a number — so the
  // hill under a jungle is counted the way the hover card counts it and not by
  // a second sum that could disagree. The two shares never overlap and neither
  // reaches a card's own line, so two cards cannot pay each other interest.
  let worksPercent = 0;
  const worksSources: string[] = [];
  let groundPercent = 0;
  const groundSources: string[] = [];
  for (const line of ctx?.lines ?? []) {
    const works = line.percent ?? 0;
    const ground = line.basePercent ?? 0;
    if (works === 0 && ground === 0) continue;
    if (!tileConditionHolds(tile, line.on, paidSoFar)) continue;
    if (works !== 0) {
      worksPercent += works;
      if (!worksSources.includes(line.source)) worksSources.push(line.source);
    }
    if (ground !== 0) {
      groundPercent += ground;
      if (!groundSources.includes(line.source)) groundSources.push(line.source);
    }
  }
  if (worksPercent !== 0 && worksTo > worksFrom) {
    const share: TileYieldContribution = {
      source: worksSources.join(' + '),
      kind: 'add',
      food: 0,
      production: 0,
      gold: 0,
      science: 0,
      culture: 0,
      faith: 0,
    };
    for (let i = worksFrom; i < worksTo; i++) {
      const entry = list[i]!;
      for (const voice of TILE_YIELD_KEYS) share[voice] += entry[voice];
    }
    let pays = false;
    for (const voice of TILE_YIELD_KEYS) {
      share[voice] = Math.floor((share[voice] * worksPercent) / 100);
      if (share[voice] !== 0) pays = true;
    }
    if (pays) list.push(share);
  }
  if (groundPercent !== 0 && worksFrom > 0) {
    const ground = foldTileYield(list.slice(0, worksFrom));
    const share: TileYieldContribution = {
      source: groundSources.join(' + '),
      kind: 'add',
      food: 0,
      production: 0,
      gold: 0,
      science: 0,
      culture: 0,
      faith: 0,
    };
    let pays = false;
    for (const voice of TILE_YIELD_KEYS) {
      share[voice] = Math.floor((ground[voice] * groundPercent) / 100);
      if (share[voice] !== 0) pays = true;
    }
    if (pays) list.push(share);
  }

  return list;
}

/**
 * The fold: `base` and `override` replace, `add` sums. The only place a tile's
 * total is ever computed.
 */
export function foldTileYield(list: readonly TileYieldContribution[]): TileYield {
  const total = emptyTileYield();
  for (const entry of list) {
    for (const key of TILE_YIELD_KEYS) {
      if (entry.kind === 'add') total[key] += entry[key];
      else total[key] = entry[key];
    }
  }
  return total;
}

/**
 * Food/production/gold of a tile — resource, improvement and renewals included.
 *
 * One line, and that is the point: it is the fold of `explainTileYield` and
 * nothing else, so the number and the explanation cannot drift apart. See the
 * docblock above `TileYieldKind` for the chain and for who passes a context.
 */
export function tileYieldOf(tile: Tile, ctx?: TileYieldContext): TileYield {
  return foldTileYield(explainTileYield(tile, ctx));
}

/**
 * How a resource came into a player's hands.
 *
 *   · `improvement` — an improvement standing on the tile opens it: the row
 *     `improvesResource` names, or **any great person's work**, which opens
 *     whatever it was planted on.
 *   · `city` — the player's **city stands on the seam**, and its owner knows
 *     how to work it. A town quarries the marble it was built on.
 *   · `lent` — **another empire lent it** under a live deal. Not a fact about
 *     any tile at all, which is why this one arrives at empire scale rather
 *     than out of `openedResource`; see `lentToPlayer` (`deals.ts`).
 */
export type ResourceVia = 'improvement' | 'city' | 'lent';

/** A resource in somebody's hands, and the reason it is there. */
export interface ResourceHolding {
  id: ResourceId;
  via: ResourceVia;
  /**
   * The improvement that opened it, or `null` when a city did.
   *
   * Carried rather than re-derived, because since the works opened seams
   * (2026-08-27) `improvementForResource(id)` is no longer the answer: iron
   * wants a mine and may be held by an academy. A ledger line that asked the
   * table would name the improvement the player did *not* build — "Iron · mine"
   * over a hill with an academy on it — which is the drift a second derivation
   * always is. One reader, `viaWord` in `meters.ts`.
   */
  improvement: ImprovementId | null;
}

/**
 * The resource a tile puts in **this player's** hands, or `null` when it puts
 * none there.
 *
 * The one rule, factored out so that the four questions asked of it cannot
 * drift: `hasResource` asks it of one named resource, `controlledResources` of a
 * whole kind at once, `cityResources` of one city's ground, and `resourceCopies`
 * counts the tiles that answer. There is deliberately no second path anywhere in
 * the simulation — every "do I have iron?" in the game goes through here.
 *
 * Three clauses, in this precedence:
 *
 *   1. **Reveal.** A player who cannot be *told* the seam is there draws nothing
 *      from it, however it is worked. That is `requiresTech` on the resource row
 *      (`resourceIsVisibleTo`), and it is checked first because it is the only
 *      clause about knowledge rather than about ground: you cannot supply an
 *      army from a thing nobody in your empire has a word for. It binds the
 *      settled path *and* the improved one — a mine dug on a hill for its
 *      hammers does not hand its owner iron before Bronze Working, which is the
 *      hole this precedence closes.
 *   2. **Improvement.** The improvement `improvesResource` names is standing on
 *      the tile. This is the original rule and it asks nothing about technology:
 *      an improvement already built keeps paying (see `ImprovementDef.requiresTech`,
 *      which gates the *build*), so a captured pasture works from the turn it
 *      changes hands.
 *   3. **The city itself.** A city standing on the seam works it as the
 *      improvement would — but only once its owner holds the technology that
 *      improvement needs. A capital founded on gems is worth nothing until
 *      Mining; the turn Mining lands, the gems appear. Nothing is stored and no
 *      flag is set: it is derived every time it is asked, so researching a
 *      technology *is* the event, with no schema and no bookkeeping of its own.
 *
 * A resource nothing improves is therefore never in anybody's hands by any of
 * the three paths — bar the work, which is the one thing that opens a seam no
 * table names, which is the honest answer rather than a special case. That used to be
 * the *whole sea* — fish, crabs and the four sea luxuries, whose work boat was
 * deferred with the rest of naval — and since Entry XXVII it is nobody: the
 * fishing boats reach all six. Note which clause opened them, because it is not
 * the third: a city still cannot be founded on water, so a sea seam is always
 * held by clause **2**, the improvement standing on it.
 */
function openedResource(
  state: GameState,
  tile: Tile,
  playerId: number,
): ResourceHolding | null {
  const id = tile.resource;
  if (id === undefined) return null;

  const player = playerById(state, playerId);
  if (!player) return null;
  if (!resourceIsVisibleTo(id, player.techsResearched)) return null;

  /**
   * **A seam this empire has lent away is not in its hands** (the deal
   * vocabulary, schema 57 — `DealTerms.luxuries`).
   *
   * Placed **second**, immediately after the reveal gate and before every
   * clause about ground, and the position is the ruling: the other three ask
   * *how* a tile is worked, and this asks whether the empire is entitled to
   * what it works at all. A citadel standing on lent silk must not hand it
   * back, and neither must a town founded on it — so nothing below this line
   * can reach a resource that has been promised across a table.
   *
   * It lends the **kind**, not the tile: two improved silk seams are one silk
   * in anybody's hands (`controlledHoldings`), so an empire that lends silk
   * lends all of it, and `resourceCopies` falls to nothing with it. The
   * receiver's half cannot live here — they own no tile carrying the seam —
   * and joins the three empire-scale readings below.
   */
  if (lentAwayBy(state, playerId).includes(id)) return null;

  // **A work opens whatever it stands on** (user, 2026-08-27), and it is read
  // *before* the table because the table cannot answer for it: a citadel is not
  // any resource's improvement and never will be. Asked of the marker
  // (`ImprovementDef.greatPerson`) rather than of an id, exactly as
  // `improvementError`'s symmetric clause is, so a sixth work inherits this.
  //
  // Only *access*, never a yield. The work pays its own three points and the
  // resource pays whatever its row pays; the mine's hammer is not added, because
  // no mine was dug — the general fortified the seam and the caravans came
  // anyway. That falls out for free: `explainTileYield` reads the improvement
  // standing on the tile, and the one standing there is the work.
  const on = tile.improvement;
  if (on !== undefined && isGreatPersonWork(on)) {
    return { id, via: 'improvement', improvement: on };
  }

  const needed = improvementForResource(id);
  if (needed === null) return null;
  if (on === needed) return { id, via: 'improvement', improvement: needed };

  if (cityAt(state, tile.col, tile.row) === undefined) return null;
  const tech = improvementDef(needed).requiresTech;
  if (tech !== undefined && !player.techsResearched.includes(tech)) return null;
  return { id, via: 'city', improvement: null };
}

/**
 * Does this player *control* this resource — hold a tile carrying it, worked by
 * the improvement that opens it or by a city standing on top of it?
 *
 * The Entry IX correction, landed, and then widened once. The v1 reading was
 * ownership alone, because there were no workers; the M7 reading required the
 * improvement; this one adds the town that was founded on the seam, for the
 * reason a settler ever picks such a tile — a city is the most thorough
 * improvement there is, and refusing it the marble under its own forum was a
 * rule nobody could play against. See `openedResource` for the whole of it.
 *
 * Ownership is a *city's*, then the city's owner's, exactly as `tileOwner`
 * stores it — so a captured city hands over its mined iron in the same breath as
 * its territory, with no bookkeeping of its own. Pillaging that mine takes the
 * iron away again, from the other end, and needs no rule of its own either.
 */
export function hasResource(
  state: GameState,
  playerId: number,
  resourceId: ResourceId,
): boolean {
  const owner = tileOwnerField(state);
  const tiles = state.map.tiles;
  for (let index = 0; index < tiles.length; index++) {
    const tile = tiles[index]!;
    if (tile.resource !== resourceId) continue;
    if (owner.at(index) !== playerId) continue;
    if (openedResource(state, tile, playerId) !== null) return true;
  }
  // And a seam somebody lent this empire, which is in its hands without being
  // on its ground. See `lentHoldings` for the whole of the asymmetry.
  return lentHoldings(state, playerId).some((holding) => holding.id === resourceId);
}

/**
 * Every luxury lent **to** this empire under a live deal, as holdings.
 *
 * The receiver's half of the lending rule, and the reason it cannot be a clause
 * in `openedResource`: that rule answers about a *tile*, and the empire being
 * paid owns no tile carrying the seam. So the giver's side is a clause there
 * and this is the same fact said at empire scale, read by the three questions
 * that are asked of an empire — `hasResource`, `resourceCopies` and
 * `controlledHoldings`.
 *
 * **The reveal gate still binds the receiver** (`resourceIsVisibleTo`), the
 * same first clause `openedResource` opens with: a people with no word for
 * silk draw nothing from a caravan of it, whoever sent it.
 *
 * `cityResources` is deliberately **not** a reader, and that is a stated cut
 * rather than an omission: a lent seam is held by no town, so the part of the
 * luxury vocabulary that is local — a signature paying "in the city that owns
 * the improved tile" (`resourceEffects.ts`) — has no city to pay in. What
 * moves across a table is the empire-scale half: the contentment, the
 * empire-scoped signatures, and the copies.
 */
function lentHoldings(state: GameState, playerId: number): ResourceHolding[] {
  const player = playerById(state, playerId);
  if (!player) return [];
  const list: ResourceHolding[] = [];
  for (const id of lentToPlayer(state, playerId)) {
    if (!resourceIsVisibleTo(id, player.techsResearched)) continue;
    list.push({ id, via: 'lent', improvement: null });
  }
  return list;
}

/**
 * How many **tiles** of one resource this player controls.
 *
 * The count `perCopy` scales by, and the one place in the game that asks the
 * question the uniqueness rule usually refuses to ask. It walks the same
 * `openedResource` rule everything else does, so a pillaged silver mine stops
 * being a copy at exactly the moment it stops being a holding.
 */
export function resourceCopies(
  state: GameState,
  playerId: number,
  resourceId: ResourceId,
): number {
  const owner = tileOwnerField(state);
  const tiles = state.map.tiles;
  let copies = 0;
  for (let index = 0; index < tiles.length; index++) {
    const tile = tiles[index]!;
    if (tile.resource !== resourceId) continue;
    if (owner.at(index) !== playerId) continue;
    if (openedResource(state, tile, playerId) !== null) copies += 1;
  }
  // **A lent seam is one copy**, whatever the lender had of it. The giver's
  // count falls to nothing (the clause in `openedResource` is about the kind,
  // not the tile) and the receiver gains exactly one, which is the reading that
  // makes lending a *transfer* rather than a multiplication: two empires can
  // never hold three copies between them where there were two.
  if (lentHoldings(state, playerId).some((holding) => holding.id === resourceId)) copies += 1;
  return copies;
}

/**
 * Every resource of one kind this player controls, **once each and with the
 * reason**, in the resource table's own order.
 *
 * `hasResource` asked of a whole kind, in one pass rather than one pass per
 * resource — and uniqueness is not a rule this has to enforce, it is what the
 * question *is*: two improved silk seams are one silk in the player's hands.
 * That is precisely what the happiness meter buys (design ledger XIV.D.3, "+4
 * per unique improved luxury"), and pricing it off this list rather than off a
 * count of tiles is what stops a plantation belt paying twice.
 *
 * `via` is carried so a ledger can say *why* — "Gems · mine" against "Gems ·
 * city" — because a player who cannot see which of their towns is holding a
 * luxury cannot see what they would lose by losing it. When the same kind is
 * held both ways it is still **one** holding, and the improved reading wins:
 * a seam somebody dug is the more specific fact, and it is the one that a
 * pillage can take away.
 *
 * The table's order rather than discovery order, so the breakdown a player reads
 * lists their luxuries the same way twice running — iteration order that is part
 * of the answer is iteration order a replay has to reproduce.
 *
 * The sweep is positional (`tileOwnerField`) rather than by coordinate, and that
 * is not a detail here: this is the most-asked question in the game — once per
 * city per meter query, about a thousand times a turn on a forty-city empire —
 * and asking ownership by col/row made each of those a full map's worth of
 * column wraps and a linear scan of `state.cities` per owned hex.
 */
export function controlledHoldings(
  state: GameState,
  playerId: number,
  kind: ResourceKind,
): ResourceHolding[] {
  // The whole holding rather than its `via` alone, because the ledger's word for
  // it now depends on *which* improvement opened the seam and not on the table.
  const held = new Map<ResourceId, ResourceHolding>();
  const owner = tileOwnerField(state);
  const tiles = state.map.tiles;
  for (let index = 0; index < tiles.length; index++) {
    if (owner.at(index) !== playerId) continue;
    const tile = tiles[index]!;
    const holding = openedResource(state, tile, playerId);
    if (holding === null || resourceDef(holding.id).kind !== kind) continue;
    if (held.get(holding.id)?.via === 'improvement') continue;
    held.set(holding.id, holding);
  }
  // A seam another empire lent, added **after** the sweep and only where the
  // empire holds none of its own: your own silk is the more specific fact, the
  // same precedence the improved reading already wins by above, and it is the
  // one a pillage or an expiry can take away separately.
  for (const lent of lentHoldings(state, playerId)) {
    if (resourceDef(lent.id).kind !== kind || held.has(lent.id)) continue;
    held.set(lent.id, lent);
  }
  return RESOURCE_IDS.filter((id) => held.has(id)).map((id) => held.get(id)!);
}

/** The same list as ids alone — what most callers want. */
export function controlledResources(
  state: GameState,
  playerId: number,
  kind: ResourceKind,
): ResourceId[] {
  return controlledHoldings(state, playerId, kind).map((holding) => holding.id);
}

/**
 * The same question one scale down: every resource of a kind that **this city**
 * controls, once each, in the resource table's own order.
 *
 * The city scale exists because part of the luxury vocabulary is local — a
 * signature that pays "in the city that owns the improved tile" needs to know
 * which city that is (`resourceEffects.ts`). It asks `openedResource`, the same
 * one rule `controlledResources` asks, so a pillaged plantation stops paying
 * both at once and neither has any bookkeeping of its own. A city standing on a
 * seam counts for itself, which is the settled reading read at city scale.
 *
 * Uniqueness is per city and that is the design, not a shortcut: two jade seams
 * in one city are one jade's signature, and jade in a second city is a second
 * signature. See the uniqueness note in `resourceEffects.ts`.
 */
export function cityResources(
  state: GameState,
  city: City,
  kind: ResourceKind,
): ResourceId[] {
  const held = new Set<ResourceId>();
  for (const tile of ownedTiles(state, city)) {
    const holding = openedResource(state, tile, city.ownerId);
    if (holding === null || resourceDef(holding.id).kind !== kind) continue;
    held.add(holding.id);
  }
  return RESOURCE_IDS.filter((id) => held.has(id));
}

/** True when a citizen may be assigned to this tile at all. */
export function isWorkableTile(tile: Tile): boolean {
  return isWorkableTerrain(tile.terrain);
}

/**
 * How much a city wants a tile: the weighted sum of its yields.
 *
 * One function for two jobs — which citizen works where, and which tile the
 * borders take next — because a city that expands toward land it would not work
 * is a city that expands for no reason.
 */
export function yieldScore(
  value: TileYield,
  weights: CitizenWeights = CITIES.citizenWeights,
): number {
  return (
    value.food * weights.food +
    value.production * weights.production +
    value.gold * weights.gold
  );
}

/** The city that owns a tile, or `null`. Reads `state.tileOwner`. */
export function tileOwnerCityId(state: GameState, col: number, row: number): number | null {
  const tile = getTileAt(state.map, col, row);
  if (!tile) return null;
  return state.tileOwner[tileIndex(state.map, tile.col, tile.row)] ?? null;
}

/** The player that owns a tile, or `null` for unclaimed (and for a stale id). */
export function tileOwnerPlayerId(state: GameState, col: number, row: number): number | null {
  const cityId = tileOwnerCityId(state, col, row);
  if (cityId === null) return null;
  return cityById(state, cityId)?.ownerId ?? null;
}

/**
 * The context a map SURFACE prices one hex with — the tile readout and the
 * yields lens. The standing rule ("an owned tile is always evaluated with its
 * owner's ctx") gains its missing half here: a hex inside a city's territory
 * is priced with that CITY's own context, so the one-town producers — a
 * lighthouse's food on water, a rite's gold on a worked seam, Petra's desert
 * — print on the map exactly where the citizen is paid. Before this, the
 * readout priced through `yieldContextFor` alone and the Lighthouse paid a
 * food the info card never showed (found in live play, 2026-09-03). Unowned
 * ground falls back to the viewer's own empire context, so the reveal gate on
 * wild seams stays the viewer's.
 */
export function tileContextAt(
  state: GameState,
  viewerId: number,
  tile: Tile,
): TileYieldContext | undefined {
  const cityId = tileOwnerCityId(state, tile.col, tile.row);
  if (cityId !== null) {
    const city = cityById(state, cityId);
    if (city) return cityContext(state, city);
  }
  return yieldContextFor(state, viewerId);
}

/** The city standing on a tile, if any. */
export function cityAt(state: GameState, col: number, row: number): City | undefined {
  for (const city of state.cities) {
    if (city.col === col && city.row === row) return city;
  }
  return undefined;
}

/**
 * The city of `playerId`'s nearest to a cell, or `null` when they hold none.
 *
 * **The one "nearest owned city" rule**, and it is shared on purpose: a grain
 * cache found in a ruin and the food bounty for burning out a barbarian camp are
 * the same sentence — *this lands in the town closest to where you are standing*
 * — and two implementations of it would be two answers on a tie. Ties go to the
 * lower city id, which is founding order, which is a fact about the state rather
 * than about which town happened to be scanned first.
 *
 * `null` is a real answer and every caller has to have a policy for it: an empire
 * with no cities at all has nowhere to put a lump of food, and the boon is
 * forfeited with the interface saying so (see `settleCampBounty` in
 * `barbarians.ts`). Silently banking it into a city that does not exist is the
 * only wrong answer.
 *
 * Distance is the map's own wrapped one, so a town on the other side of the seam
 * is as near as the hexes say it is.
 */
export function nearestOwnedCity(
  state: GameState,
  playerId: number,
  cell: Cell,
): City | null {
  const { map } = state;
  const from = getTileAt(map, cell.col, cell.row);
  if (!from) return null;
  const hex = tileHex(from);
  let best: City | null = null;
  let bestDistance = Infinity;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const distance = wrappedDistance(map, hex, tileHex(cityTile(map, city)));
    // Strictly nearer, so the first city in `state.cities` order — the oldest —
    // keeps a tie. See the docblock.
    if (distance < bestDistance) {
      best = city;
      bestDistance = distance;
    }
  }
  return best;
}

/** Hex distance from a cell to the nearest city centre, or `Infinity`. */
export function distanceToNearestCity(state: GameState, hex: Hex): number {
  let best = Infinity;
  for (const city of state.cities) {
    const distance = wrappedDistance(state.map, hex, tileHex(cityTile(state.map, city)));
    if (distance < best) best = distance;
  }
  return best;
}

/** One labelled line the seat of government pays its town. See below. */
export interface PalaceYieldLine {
  /** Display label. `"Palace"`, and only ever that today. */
  source: string;
  gold: number;
}

/**
 * What the **palace** pays the town it stands in, as the ordered list the
 * figure is the fold of (rule 5) — one line in the capital, none anywhere else.
 *
 * The user's ruling of 2026-08-28: `rules.cities.palaceGold` is 2💰, and it is
 * a *line* rather than a term because that is what rule 5 asks of any new source
 * of a yield. A player looking at a capital that makes more gold than its tiles
 * explain must be able to read why.
 *
 * It is the palace's third gift and it is shaped like the other two — the
 * happiness in `explainHappiness` and the capacity in `explainAuthority` both
 * print a "Palace" line off `capitalCityOf`, and this is the same fact said to
 * a third meter. There is deliberately no palace *building*: nothing is built,
 * nothing is captured with the stones, and an empire whose first city falls has
 * its palace wherever `capitalCityOf` now points.
 *
 * A list of at most one, rather than a `number | null`, so that a second thing
 * the seat of government supplies joins by appending — and so the caller folds
 * it exactly as it folds the luxuries, the cards and the routes beside it.
 */
export function explainPalaceYield(state: GameState, city: City): PalaceYieldLine[] {
  if (CITIES.palaceGold === 0) return [];
  const capital = capitalCityOf(state, city.ownerId);
  if (!capital || capital.id !== city.id) return [];
  return [{ source: 'Palace', gold: CITIES.palaceGold }];
}

/**
 * Is this city on the coast — the site bonus the settler lens paints blue?
 *
 * One evaluator (design ledger, Entry I.b): `isCoastal` is the same test the
 * lens colours a candidate site with, asked of the tile the city ended up on. A
 * city that was promised a discount by a blue hex gets the discount.
 */
export function isCoastalCity(state: GameState, city: City): boolean {
  return isCoastal(state.map, cityTile(state.map, city));
}

/** The tile a city stands on. Cities are only ever founded on real tiles. */
export function cityTile(map: GameMap, city: City): Tile {
  const tile = getTileAt(map, city.col, city.row);
  if (!tile) throw new Error(`City ${city.id} is not on the map at (${city.col}, ${city.row})`);
  return tile;
}

/**
 * Gives a tile to a city, unless somebody already has it. Returns whether the
 * claim went through — contention is resolved by who asks first, and callers
 * that care are expected to check.
 */
export function claimTile(state: GameState, city: City, tile: Tile): boolean {
  const index = tileIndex(state.map, tile.col, tile.row);
  if (state.tileOwner[index] !== null) return false;
  state.tileOwner[index] = city.id;
  return true;
}

/** Every tile a city owns, in tile-index order. */
export function ownedTiles(state: GameState, city: City): Tile[] {
  const result: Tile[] = [];
  for (const tile of mapRange(state.map, tileHex(cityTile(state.map, city)), CITIES.claimRadius)) {
    if (state.tileOwner[tileIndex(state.map, tile.col, tile.row)] === city.id) result.push(tile);
  }
  result.sort((a, b) => tileIndex(state.map, a.col, a.row) - tileIndex(state.map, b.col, b.row));
  return result;
}

// --- founding ---------------------------------------------------------------

/**
 * The name a player's next city gets: the rules list in order, then a numbered
 * fallback so a prolific empire never runs out.
 *
 * Counted from the cities the player already has rather than stored, so it is a
 * pure function of the state — but the *result* is stored on the city (see
 * `City.name`), because two cities must not swap names when one is destroyed.
 */
export function nextCityName(state: GameState, ownerId: number): string {
  const owned = state.cities.filter((city) => city.ownerId === ownerId).length;
  const names = CITIES.cityNames;
  const fromList = names[owned];
  if (fromList !== undefined) return fromList;
  const player = playerById(state, ownerId);
  return `${player?.name ?? `Player ${ownerId}`} ${owned + 1 - names.length}`;
}

/**
 * Puts a city on a tile and claims its opening territory: the centre, plus every
 * unclaimed tile in the ring around it.
 *
 * The centre is taken *unconditionally* while the ring is taken only if free.
 * The asymmetry is deliberate and can only ever matter inside one player's own
 * borders — the `foundCity` command refuses a tile another player owns — so this
 * is the case of a second city planted inside the first one's territory: the
 * tile it stands on becomes its own, and its neighbours stay with whoever
 * already worked them.
 *
 * Validates nothing. The rules are the command's job; this is the mechanism.
 */
export function foundCityAt(state: GameState, ownerId: number, tile: Tile): City {
  // **A town covers what is buried under it** (the user's ruling, the layers
  // pass). A gated site — a barrow nobody has the surveyors for yet — sits on
  // the board waiting for an age, and a city founded on top of it would be a
  // boon nothing could ever reach: `claimDiscoveryAt` refuses a hex a town
  // stands on for the same reason every other verb does. So the site is dropped,
  // quietly and without a report, exactly as the ratified note asks.
  //
  // Only the **gated** layers. A ruin or a village is claimed by the settler's
  // own arrival on the way in (`arriveOnTile`, which runs before this), so there
  // is nothing left to drop and a clause that dropped one anyway would be
  // deleting a boon the player had already been dealt.
  if (tile.discovery !== undefined && discoveryKindTech(tile.discovery) !== null) {
    delete tile.discovery;
  }
  const city = createCity(state, ownerId, nextCityName(state, ownerId), tile.col, tile.row);
  state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
  // The Founder's count (design ledger Entry VI). On the player rather than
  // derived, because once a town changes hands nothing on the board says who
  // built it — see `Player.citiesFounded`. Raised in the mechanism so an AI's
  // eighth city counts like a player's.
  const founder = playerById(state, ownerId);
  if (founder) founder.citiesFounded += 1;
  for (const near of mapRange(state.map, tileHex(tile), 1)) {
    claimTile(state, city, near);
  }
  // What this empire's law founds a city *with* (`foundingRider`): Homestead
  // Charters' extra citizen, The Founders' Road's monument. Written before the
  // refresh below, and that ordering is the point — a city founded at size 2 has
  // two citizens to place, and a refresh run first would seat one.
  const rider = cardFoundingRider(state, ownerId);
  if (rider.population > 0) city.population += rider.population;
  for (const building of rider.buildings) {
    if (!city.buildings.includes(building)) city.buildings.push(building);
  }
  if (rider.roads) layFoundingRoad(state, city);
  // A new city is working from the moment it exists, not from the end of the
  // turn: the panel opens on a city that is already doing something, and the
  // yields it reports are the ones it will actually collect. `collectYields`
  // recomputes this anyway, and gets the same answer. Through the same helper
  // every mid-turn mutation uses — founding is the one that *creates* the
  // derived state rather than correcting it, and it is still the same call.
  refreshCityDerived(state, city);
  // And it is looking from the moment it exists. Refreshed *here* rather than
  // inside `createCity`, because a city sees its own territory and the territory
  // is claimed two lines above — a refresh in the constructor would light the
  // centre and leave the opening ring dark until something else moved.
  recomputeVisibility(state, ownerId);
  // The Third Hearth, and The Far Shore. In the **mechanism** rather than in the
  // `foundCity` handler, for `buildImprovementAt`'s stated reason: an AI that
  // founds a city earns what a player would, without anybody remembering to add
  // a line. It reports nothing here — `Player.triumphs` is the record and the
  // news is a diff (`triumphsAwarded`), which is why this seam needed no new
  // parameter and no new return value.
  awardFoundingTriumphs(state, city);
  return city;
}

/**
 * Joins a newly founded town to the nearest town of the same realm by road —
 * The Founders' Road's second half, and nothing else calls it.
 *
 * **A survey, not a straight line** (the user's ruling, 2026-08-28): *"add roads
 * if there is a viable path (no limit to road length); the roads are
 * maintenance-free; if no road can be added, the road doesn't appear and the
 * city is not considered connected."* Three clauses, and each replaced something
 * this function used to do.
 *
 * **1. A path, not a line.** It ran down `hexLine` and skipped whatever was
 * impassable, which meant a strait or a ridge left a *gap* — a road that stopped
 * at the water, resumed on the far shore, and connected nothing, while looking
 * on the board exactly like a road that worked. So it is `findPath` now, walked
 * by a caravan-shaped probe: `caravanTypeId`'s row, standing in the new town's
 * gates. The probe is a **caravan** rather than the settler that was spent
 * getting here for two reasons that arrived together — the road a doctrine
 * decrees is the road a caravan would have worn, which is what the effect's own
 * docblock has always claimed, and a trader is its own stacking category since
 * the same day's other ruling, so no piece parked in either town's gates can
 * refuse the survey. A road is about ground; a garrison is not ground.
 *
 * The profile is passed explicitly with **`embarks: false`**, which is the one
 * thing the probe must not inherit from its empire: a caravan whose owner holds
 * Sailing may cross coast, and a road may not. That is what makes the strait
 * fatal rather than incidental.
 *
 * **2. No limit.** There is no length cap and no turn budget — `findPath` is
 * asked for a route, never for a march — so a realm that founds across a
 * continent gets the whole road. "Nearest" is therefore measured in **path
 * hexes** rather than in hex distance, because the nearest town as the crow
 * flies is the wrong town when a bay lies between: candidates are sorted by hex
 * distance (a lower bound on any path through them) and the sweep stops the
 * moment the best path found is no longer than the next candidate's floor. Ties
 * go to the earlier city in `state.cities`, which is founding order.
 *
 * **3. Free.** Every hex is laid with `layRoad`'s `free` arm, so `roadsBuiltBy`
 * does not count them and the empire is charged nothing for a road it was given.
 * A hex that already carried a road is left exactly as it was — `layRoad`
 * refuses to repave — so a decree never launders somebody's maintenance bill
 * away, and a caravan that later walks a decreed hex never adds one.
 *
 * **No path ⇒ no road.** Nothing is laid at all, which is the ruling's fourth
 * sentence, and "the city is not considered connected" needs no code: with no
 * road on the ground `connectedCities`' fill simply never reaches it.
 *
 * The first city of a realm has nowhere to be joined to and is left alone.
 * Writing through `layRoad` (`roads.ts`) is still the point: one writer for
 * `Tile.road`, so a decreed highway and a worn one are the same mark.
 */
function layFoundingRoad(state: GameState, city: City): void {
  const type = caravanTypeId();
  if (!type) return;
  const start = getTileAt(state.map, city.col, city.row);
  if (!start) return;

  // Every other town of this realm, nearest-by-hex first. The order is only a
  // *search* order — the answer is decided on path length below — but it is what
  // lets the prune be exact, and `state.cities` order breaks ties so two towns
  // equidistant from a new one always resolve the same way in a replay.
  const here = tileHex(start);
  const candidates: { city: City; floor: number }[] = [];
  for (const other of state.cities) {
    if (other.ownerId !== city.ownerId || other.id === city.id) continue;
    candidates.push({ city: other, floor: wrappedDistance(state.map, tileHex(cityTile(state.map, other)), here) });
  }
  candidates.sort((a, b) => a.floor - b.floor);

  const def = unitDef(type);
  const probe: Unit = {
    id: -1,
    ownerId: city.ownerId,
    type,
    col: city.col,
    row: city.row,
    hp: def.maxHp,
    movesLeft: def.movement,
    hasAttacked: false,
  };
  // A road does not swim, whatever the empire's caravans may do. See above.
  // `full` is the row's own allowance and is inert here: it prices a shore
  // crossing, and a survey that may not enter the water never takes one.
  const mover: MoveProfile = {
    def,
    embarks: false,
    naval: false,
    ocean: false,
    full: def.movement,
  };

  let route: Cell[] | null = null;
  for (const candidate of candidates) {
    // A path can never be shorter than the hex distance it spans, so once the
    // best route is at or under the next candidate's floor nothing further can
    // beat it.
    if (route !== null && route.length <= candidate.floor) break;
    const goal = getTileAt(state.map, candidate.city.col, candidate.city.row);
    if (!goal) continue;
    const found = findPath(state, probe, goal, mover);
    if (found === null) continue;
    if (route === null || found.length < route.length) route = found;
  }
  if (route === null) return;

  for (const cell of route) {
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) continue;
    layRoad(tile, city.ownerId, true);
  }
}

/**
 * Why a player of `ownerId` could not put a city on this *ground*, or `null`
 * when they could.
 *
 * Everything here is a question about the tile: can a city physically stand on
 * it, does somebody else own it, and is it far enough from every existing city.
 * Nothing here is about a unit — no health, no type, no movement — and nothing
 * is about the turn.
 *
 * That split is what lets two callers share one rule. `foundingError` adds the
 * settler's own questions on top and is what the `foundCity` command validates
 * with; the settler *lens* asks this directly, tile by tile, to paint the board
 * with the answer before a settler has walked anywhere. A lens that disagreed
 * with the command it is advertising would be worse than no lens.
 */
export function foundingErrorAt(
  state: GameState,
  ownerId: number,
  tile: Tile,
): string | null {
  // Water and mountains are impassable, so a unit cannot be standing on one —
  // but a hand-edited save can, and a city on the ocean floor is worse than a
  // rejected command.
  if (!isPassable(tile)) return `(${tile.col}, ${tile.row}) cannot hold a city`;

  const tileOwner = tileOwnerPlayerId(state, tile.col, tile.row);
  if (tileOwner !== null && tileOwner !== ownerId) {
    return `(${tile.col}, ${tile.row}) belongs to player ${tileOwner}`;
  }

  // The spacing rule, and it is deliberately stated as a *distance* rather than
  // as an exclusion radius: two city centres must be at least `minCitySpacing`
  // hexes apart, which is the same sentence from the other end as "no city
  // within `minCitySpacing − 1` hexes of an existing one". At 4 that refused
  // ring is exactly `workRadius`, so a settler can never plant a town inside the
  // ground another town is already working — anyone's, because a rival's
  // citizens are working it just as hard as your own.
  const spacing = CITIES.minCitySpacing;
  const nearest = distanceToNearestCity(state, tileHex(tile));
  if (nearest < spacing) {
    return (
      `(${tile.col}, ${tile.row}) is ${nearest} tile(s) from the nearest city; ` +
      `${spacing} required`
    );
  }
  return null;
}

/**
 * Why this unit cannot found a city where it stands, or `null` when it can.
 *
 * Split out of the `foundCity` command so the UI and the reducer share one
 * answer: the "Found City" button is enabled by exactly the rule that decides
 * whether the command will be accepted, which is the only way a disabled button
 * and a rejected command cannot disagree.
 *
 * The unit's own questions are asked here and the ground's are delegated to
 * `foundingErrorAt`, in that order: a warrior standing on a perfect city site
 * should be told it is a warrior, not told about the site.
 *
 * It deliberately does *not* check who is asking or whether their turn has
 * ended. Those are questions about the actor, not about the ground, and they
 * belong to the command — the UI already knows whose seat it is playing.
 */
export function foundingError(state: GameState, unit: Unit): string | null {
  if (unit.hp <= 0) return `Unit ${unit.id} is not alive`;
  const def = unitDef(unit.type);
  if (!def.foundsCity) return `A ${def.name} cannot found a city`;
  if (unit.movesLeft <= 0) return `Unit ${unit.id} has no movement left`;

  const tile = getTileAt(state.map, unit.col, unit.row);
  if (!tile) return `Unit ${unit.id} is not on the map`;
  return foundingErrorAt(state, unit.ownerId, tile);
}

// --- citizens ---------------------------------------------------------------

/**
 * Is this cell inside a city's work radius — the ground the city is *about*?
 *
 * Deliberately wider than `assignableTiles`, and the two answer different
 * questions. That list is "where may a citizen be sent", which excludes the free
 * centre, unworkable ground and every tile a rival owns. This is "is this hex
 * part of this city's business at all", which those tiles very much are: a
 * mountain in the ring is ground the city could one day claim, and the town
 * itself is the middle of it.
 *
 * It exists because the interface asks the second question on every click while
 * a city panel is open (see `handleLeftClick` in `src/ui/controls.ts`, where it
 * decides whether a click pins a citizen or closes the screen), and asking it as
 * a distance rather than by building the ring is what keeps that free. The
 * distance is the map's own wrapped one, so a city near the seam owns the tiles
 * on the other side of it exactly as it does anywhere else.
 */
export function withinWorkRadius(
  state: GameState,
  city: City,
  col: number,
  row: number,
): boolean {
  const { map } = state;
  const tile = getTileAt(map, col, row);
  if (!tile) return false;
  const centre = tileHex(cityTile(map, city));
  return wrappedDistance(map, centre, tileHex(tile)) <= CITIES.workRadius;
}

/**
 * The tiles a citizen of this city could be sent to: owned by *this* city,
 * workable, inside the work radius, and not the free centre.
 *
 * A tile owned by another of the player's own cities is not on the list. Tiles
 * belong to one city and are worked by that city, which is what stops two
 * neighbours double-counting the same wheat field.
 */
export function assignableTiles(state: GameState, city: City): Tile[] {
  const { map } = state;
  const centre = cityTile(map, city);
  const centreIndex = tileIndex(map, centre.col, centre.row);
  const result: Tile[] = [];
  for (const tile of mapRange(map, tileHex(centre), CITIES.workRadius)) {
    const index = tileIndex(map, tile.col, tile.row);
    if (index === centreIndex) continue;
    if (state.tileOwner[index] !== city.id) continue;
    if (!isWorkableTile(tile)) continue;
    result.push(tile);
  }
  return result;
}

/**
 * How many citizens this city could actually seat on the land — the length of
 * the very list the assignment chooses from.
 *
 * Asked of `assignableTiles` rather than re-derived, which makes it exactly the
 * enumeration `chooseCitizens` walks: this city's ground, workable, inside the
 * work radius, and not the free centre (which is worked for nothing and is never
 * a citizen's seat). One rule, one implementation — a second count that
 * disagreed with the greedy would be a town told it has idle people while every
 * one of them is standing on a hex.
 *
 * Its reader is the guild bar (Entry XLVIII): `population − specialists − seats`
 * is how many of a town's people have nowhere to go, which is precisely the
 * problem specialists exist to answer and so the thing that hurries them along.
 */
export function workableSeats(state: GameState, city: City): number {
  return assignableTiles(state, city).length;
}

/**
 * Recomputes `city.workedTiles` from scratch: every honoured lock first, then
 * the best remaining assignable tiles by weighted yield, ties by tile index,
 * until `population − specialists` citizens are placed.
 *
 * Specialists
 * -----------
 * A guildsman is a citizen of this town who is not standing on a hex (Entry
 * XLVIII), so the seats to fill are the population **less** whoever is in the
 * trades. Nothing else about the assignment changed for them, and that is the
 * design: one fewer seat means the greedy stops one tile earlier, so the hex a
 * new guild costs the town is the worst-scoring one it was working. See
 * `chooseCitizens`.
 *
 * Locks
 * -----
 * A lock is honoured when the tile it names is currently assignable — this
 * city's, workable, inside the work radius. A lock that is *not* is **ignored
 * and kept**: the list is player intent, and a tile lost to a rival's culture
 * or turned unworkable is a tile the player still wants back. Deleting the
 * entry would silently forget a decision the moment the board moved, and
 * re-pinning after every border shove is not a game mechanic anybody asked for.
 * The cost is a list that can hold entries doing nothing, which is invisible
 * (the panel counts honoured pins) and cheap.
 *
 * Locks are read in list order and stop at `population`, so a city that starves
 * back to two citizens keeps the two tiles the player pinned *first* — the
 * order the pins were made in is part of the intent, and it is the only
 * tie-break that does not silently re-rank the player's own choices by score.
 *
 * The result is stored sorted by tile index rather than by score, so the state
 * serialises identically however the sort arrived at it, and so the UI can draw
 * the dots in a stable order.
 *
 * Focus
 * -----
 * A town whose growth is halted — a settler at the front of the queue — scores
 * with `citizenWeightsWhileHalted` instead, which puts hammers over bushels
 * (playtest batch two: "a city should auto-work production tiles when creating a
 * settler"). It is asked of `growthIsHalted`, which is asked of the row's
 * `haltsGrowth`, so nothing here compares a unit type against `"settler"` — the
 * marker is the *rule*, and the day something else stops a town growing it gets
 * the same focus for free.
 *
 * The focus is a preference and never a way to starve a town: if the swapped
 * sheet leaves the city short of what its citizens eat, the ordinary sheet is
 * used instead. That check is made against `cityYields`, the same evaluator the
 * pipeline banks with, so what it refuses is exactly the deficit `growCities`
 * would have taken a population point for.
 */
export function assignCitizens(state: GameState, city: City): void {
  writeAssignment(state, city, chooseCitizens(state, city, CITIES.citizenWeights));
  if (!growthIsHalted(city)) return;
  // The focused sheet, tried and kept only if it feeds the town. The balanced
  // assignment is already written, so `cityYields` below reads the *focused*
  // one — one call each way rather than a hypothetical, which is what keeps this
  // the same arithmetic the turn pipeline performs.
  const balanced = city.workedTiles;
  writeAssignment(state, city, chooseCitizens(state, city, CITIES.citizenWeightsWhileHalted));
  if (cityYields(state, city).food < foodUpkeep(city)) city.workedTiles = balanced;
}

/**
 * Which weights this city's citizens are being placed by, for a panel that wants
 * to say so.
 *
 * The *decision*, not the outcome: it says a settler is at the front and the
 * town is chasing hammers, which is what a "focus" readout means. Whether the
 * starvation guard in `assignCitizens` then put the balanced sheet back is a
 * fact about one board, and a readout that flickered between two words as a
 * border moved would be a readout nobody could read.
 */
export function citizenFocus(city: City): 'balanced' | 'production' {
  return growthIsHalted(city) ? 'production' : 'balanced';
}

/** Stores an assignment on the city, sorted by tile index. See `assignCitizens`. */
function writeAssignment(state: GameState, city: City, worked: readonly Tile[]): void {
  const { map } = state;
  const ordered = [...worked].sort(
    (a, b) => tileIndex(map, a.col, a.row) - tileIndex(map, b.col, b.row),
  );
  city.workedTiles = ordered.map((tile) => ({ col: tile.col, row: tile.row }));
}

/**
 * The greedy itself: honoured locks first, then the best remaining tiles by
 * `weights`. Pure — it reads the board and returns a list, so `assignCitizens`
 * can ask it twice with two sheets and keep the one that feeds the town.
 */
function chooseCitizens(
  state: GameState,
  city: City,
  weights: CitizenWeights,
): Tile[] {
  const { map } = state;
  const candidates = assignableTiles(state, city);
  const index = (tile: Tile): number => tileIndex(map, tile.col, tile.row);
  // **Citizens in the fields, not citizens** (Entry XLVIII). A guildsman is a
  // person of this town who is not standing on a hex, so the seats to fill are
  // `population − specialists` — and the "one fewer citizen works the land" rule
  // falls out of that subtraction rather than needing a clause: the greedy fills
  // one seat less, so the tile that goes is the last one it would have taken,
  // which is the worst-scoring hex the town was working. Honoured pins come
  // first as always, so a player's own choice is never what a guild costs them.
  const cap = Math.max(0, city.population - totalSpecialists(city));

  const assignable = new Map<number, Tile>();
  for (const tile of candidates) assignable.set(index(tile), tile);

  const taken = new Set<number>();
  const worked: Tile[] = [];
  for (const cell of city.lockedTiles) {
    if (worked.length >= cap) break;
    const tile = getTileAt(map, cell.col, cell.row);
    if (!tile) continue;
    const at = index(tile);
    // Not assignable (or named twice): ignored for this assignment, and left in
    // the list for the next one.
    if (!assignable.has(at) || taken.has(at)) continue;
    taken.add(at);
    worked.push(tile);
  }

  // The owner's context, so a citizen is sent to the tile a renewal has made
  // the best one — the turn the renewal lands, not the turn after.
  const ctx = cityContext(state, city);
  const scores = new Map<number, number>();
  for (const tile of candidates) {
    scores.set(index(tile), yieldScore(tileYieldOf(tile, ctx), weights));
  }
  candidates.sort((a, b) => {
    const ia = index(a);
    const ib = index(b);
    return scores.get(ib)! - scores.get(ia)! || ia - ib;
  });

  for (const tile of candidates) {
    if (worked.length >= cap) break;
    if (taken.has(index(tile))) continue;
    worked.push(tile);
  }
  return worked;
}

/**
 * **The mid-turn refresh.** Every mutation that changes what a city's ground is
 * worth, outside the turn pipeline, calls this and then joins the register.
 *
 * The problem it closes is the oldest trap in CLAUDE.md: city-panel yields are
 * *derived* state, recomputed by `collectYields` at the end of the turn, so a
 * command that improved a tile at 10:00 left the panel quoting the 09:59 numbers
 * until the player ended their turn. That was fixed once per mutation, by hand,
 * three times running — `setLockedTiles`, then `purchaseTileAt`, then the chop's
 * windfall — and a fourth hand-rolled copy is how a register becomes a list of
 * places somebody forgot.
 *
 * So there is one helper and a register of its callers, rather than a register
 * of exceptions:
 *
 *   1. `setLockedTiles` (`commands.ts`) — pinning a citizen. The precedent.
 *   2. `purchaseTileAt` — bought ground is worked ground before the turn ends.
 *   3. `settleProductionWindfall` — a one-time grant that completes an item.
 *      **The `contribute` verb joins here rather than as an entry of its own**
 *      (Entry LV): a contribution is hammers into the basket like any windfall,
 *      so `contributeAt` (`purchase.ts`) settles through this wrapper and owes
 *      the register nothing further. A second way to pour a bank into a basket
 *      does the same, or it is a hand-rolled completion.
 *   4. `buildImprovementAt` (`improvements.ts`) — the farm pays this instant.
 *   5. `pillageAt` (`improvements.ts`) — and so does its absence, to its victim.
 *   6. `chopFeatureAt` (`improvements.ts`) — the felled wood changes the ground
 *      under the citizen whether or not the timber finished anything.
 *   7. `foundCityAt` — the odd one out, and included on purpose: it *creates*
 *      the derived state rather than correcting it, and routing it through here
 *      anyway is what makes the claim below exactly true.
 *   8. `settleGrowthWindfall` — a grain cache or a camp's provisions that fills
 *      the basket (Entry XX). It owes strictly more than the production windfall
 *      does: a city that just gained a citizen has a citizen to *place*.
 *   9. `settleResearchWindfall` (`tech.ts`) — the odd one at the other end: it
 *      refreshes **every** city of one empire rather than one city, because a
 *      technology is an empire-wide fact about what ground is worth (a renewal, a
 *      resource reveal) and the citizen who should move is in whichever town
 *      happens to stand on the seam.
 *  13. **The great-person verbs** (`greatPeople.ts`) — the newest entries, and
 *      they are three different reasons rather than one. An **engineer's act**
 *      pours hammers into a town and settles them, so it refreshes for
 *      `settleProductionWindfall`'s reason; an **artist's act** hangs a timed
 *      happiness on the town, which is a `CardEffect` the city's own ledger
 *      reads, so the panel must not be quoting the figure from before it; and
 *      **every work** writes `Tile.improvement`, so it refreshes through
 *      `refreshTileDerived` exactly as `buildImprovementAt` does — plus, for the
 *      **citadel**, the town whose borders just swallowed seven hexes.
 *      `settleRenownWindfall` (`renown.ts`) is the one that owes this register
 *      **nothing**, exactly as `settleCultureWindfall` owes it nothing: a
 *      recruitment mutates no city's derived state, it puts a *decision* on the
 *      empire, and the End Turn blocker is what collects it. It is named here
 *      anyway so the register stays the complete answer to "what settles".
 *  14. **`settleBorderWindfall`** — culture poured into a *town's bounds* rather
 *      than into the empire's draft pool (Consecration of the Bounds). The
 *      register's newest entry and the one whose refresh is least obvious: the
 *      hex it claims is a hex a citizen may now be sent to, so the panel that is
 *      wrong without this is the one showing where the town's people are
 *      standing.
 *  15. **The trade verbs** (`trade.ts`) — `startRouteAt` and `endRoute`, and they
 *      are one reason read from both ends: a route's food and hammers are lines
 *      of the **destination's** `cityYields` (2026-08-27: the origin's buildings
 *      set the figure, the destination banks it), so the turn a route opens that
 *      town is already richer and the turn its route ends it is already poorer.
 *      The caravan's own *march* owes this register nothing — a route pays
 *      wherever its two cities stand, not wherever the trader is walking —
 *      which is why the shuttle phase does not refresh and does not need to.
 *  16. **A belief taken, and a belief given back** (`refreshBeliefDerived` in
 *      `religion.ts`) — `settleResearchWindfall`'s shape rather than a single
 *      town's, and for its argument: a belief is an empire-wide fact about what
 *      *ground* is worth (Ecclesia pays a holy site's hex, Desert Fathers pays
 *      every dune), so the citizen who should move is in whichever town stands
 *      on the seam and all of them are re-seated. Both directions reach it, and
 *      the second is the one added last (2026-08-29, Recasting the Omens): a god
 *      handed back stops paying the instant it leaves the list, so the town that
 *      had a citizen out on a dune for it must be told before the turn ends.
 *  17. **The guild verbs** (`guilds.ts`, ledger Entry XLVIII) — and they are one
 *      reason read from both ends. A citizen who joins a trade *stops working a
 *      hex* and a citizen the player dismisses *starts working one again*, so
 *      the town has a seat to fill either way and the assignment is exactly the
 *      derived state that changed. The `guilds` phase reaches it too, once per
 *      converted city, which is the register's own courtesy rather than a
 *      requirement — the phase runs inside the pipeline and `collectYields`
 *      would re-seat the town next turn regardless — but `dismissSpecialistAt`
 *      is a **command's** mutation and owes it outright.
 *  18. **A bead's boon** (`payWindfall` in `beads.ts`, design ledger Entry VI) —
 *      and it owes the register nothing new, which is the point of it being
 *      here. Every arm of a boon reaches one of the wrappers *above*: food into
 *      the basket through `settleGrowthWindfall`, hammers through
 *      `settleProductionWindfall`, a citizen outright through
 *      `settlePopulationWindfall`, beakers, culture and renown through their
 *      own seams — so the only thing the boon adds of its own is a refresh
 *      beside the two that write a basket directly, and no fourth path into a
 *      bucket. It is in this list anyway so the register stays the complete
 *      answer to "what settles".
 *
 *  19. **An annexation** (`annexCityAt` in `diplomacy.ts`, the war ruling of
 *      2026-09-03) — a puppet taken into the empire proper. It is here for
 *      entry 18's reason turned round: what it changes is not a *yield* but the
 *      two empire meters (a puppet asks less writ and less contentment), and
 *      happiness reaches `cityYields` through `meterEffects`, so the town's own
 *      assignment is judged against a factor that has just moved. It costs one
 *      re-seat on a verb a player issues by hand.
 *
 *  20. **The deal verbs** (`reseatEmpire` in `diplomacy.ts`, schema 57) —
 *      `settleResearchWindfall`'s shape a third time, and for its argument
 *      exactly: a lent luxury is an empire-wide fact about what ground is worth
 *      (a signature that pays a hex, a happiness factor `meterEffects` folds
 *      into `cityYields`), and it moves *both* empires at once, so both are
 *      re-seated. Four moments reach it — a bargain signed, a peace whose terms
 *      executed, a declaration that cancelled one, and the broom that swept a
 *      lapsed one out (`settleDiplomacy`, `turn.ts`) — which is every moment a
 *      row enters or leaves `state.deals`. A future term that changes what a hex
 *      pays joins by being a term; it needs nothing new here.
 *
 * `assignCitizens` therefore has exactly two callers in the simulation: this,
 * and `collectYields` — the phase that owns it. `test/sim/cities.test.ts`
 * asserts that, because it is the one property a new mutation can break while
 * every behavioural test still passes.
 *
 * **A new mid-turn yield mutation calls this and adds itself to the list.**
 *
 * What makes it safe is what made every one of those safe: assignment is
 * idempotent and derived. `collectYields` re-runs it from scratch at the top of
 * the very next turn and reaches the same answer, so this can never *be* the
 * thing that decides anything — it only stops the interface lying in the gap.
 * It is deliberately not a "recompute everything": the yields the panel prints
 * are computed on read (`cityYields`), and the one piece of derived state that
 * is *stored* is the citizen assignment. One call, one city, no allocation.
 */
export function refreshCityDerived(state: GameState, city: City): void {
  assignCitizens(state, city);
}

/**
 * `refreshCityDerived` for a mutation that names a **tile** rather than a city:
 * refreshes the city that owns the ground, if any owns it.
 *
 * The adapter exists because the improvement verbs are the first mid-turn
 * mutations whose subject is a hex — a worker builds on a tile, a raider burns
 * one — and the city that has to be told is the one whose borders the tile is
 * inside, which is `tileOwner`'s answer and not the actor's. That is what gets
 * a *pillage* right: the refresh is owed to the victim's panel, not the
 * raider's, and asking the ground rather than the unit is the only reading that
 * says so. Unclaimed ground is a no-op, because no panel is quoting it.
 */
export function refreshTileDerived(state: GameState, tile: Tile): void {
  const cityId = tileOwnerCityId(state, tile.col, tile.row);
  if (cityId === null) return;
  const city = cityById(state, cityId);
  if (city) refreshCityDerived(state, city);
}

// --- yields -----------------------------------------------------------------

/**
 * The label the centre's own line carries in a breakdown. One string, because
 * the hover card, the city panel and a test all have to name the same line.
 */
export const CENTRE_SOURCE = 'City centre';

/** The prefix on the line that says the ground under the town was better. */
const INHERITED_PREFIX = 'Inherited';

/**
 * What the city centre pays, and *why* — rule 5 applied to the one tile no
 * citizen works.
 *
 * The rule, as ratified: **a centre pays `baseCityYields`, and inherits the
 * ground's own yield in any voice where the ground pays more.** A city is a
 * city wherever it stands — one planted on snow still feeds itself — but a town
 * on a wheat field keeps the wheat and a town on a hill keeps the hammers. Per
 * *voice* and not per tile, so a 3🌾/2🪙 seam under a town reads 3🌾/2⚙/2🪙:
 * the food and the gold are the ground's, the production is the town's own.
 *
 * The list, and why it is shaped this way
 * ---------------------------------------
 * Two lines, and the fold of them is the maximum, exactly:
 *
 *   `City centre`        the flat base, as a `base` entry — what standing here
 *                        is worth before the ground is consulted at all.
 *   `Inherited · …`      an `add` entry carrying, per voice, however much the
 *                        ground beats the base by. Zero in every voice the base
 *                        already covers, and omitted entirely when the ground
 *                        beats it nowhere.
 *
 * `base + max(ground − base, 0)` is `max(base, ground)` per voice, so the fold
 * is the rule and there is no total computed beside the list (rule 5). The
 * alternative — printing the ground's own breakdown and then a top-up line —
 * folds to the same number but reads backwards: the centre's floor is the
 * headline of what a town is worth, not a footnote under the grass.
 *
 * The inherited line **names the ground that earned it**, because "inherited"
 * with no subject is the one thing a player cannot act on: `Inherited · Wheat`
 * says move the town one hex and you lose the wheat. The names are read off the
 * ground's own `explainTileYield` list and the test is *what the base does not
 * already cover*: every `add` line paying into an inherited voice, plus the
 * effective terrain line (the last `base`/`override`, which is what the tile
 * actually is) only when the terrain **by itself** beats the base somewhere —
 * an oasis does, plain grassland under a wheat field does not, and listing the
 * grass there would name the half of the sum the town was getting anyway. No
 * arithmetic is attributed to any one name: the line carries the whole excess
 * and the label says what is responsible for it.
 *
 * Evaluated through the **city owner's** context, like everything else a city
 * banks (see `yieldContextFor`): the centre of a town on iron is worth the iron
 * only to an empire that has heard of it.
 */
export function explainCentreYield(state: GameState, city: City): TileYieldContribution[] {
  const ground = explainTileYield(cityTile(state.map, city), cityContext(state, city));
  const under = foldTileYield(ground);
  const base = readTileYield(CITIES.baseCityYields);

  const list: TileYieldContribution[] = [
    { source: CENTRE_SOURCE, kind: 'base', ...base },
  ];

  const inherited = emptyTileYield();
  let inheritsAnything = false;
  for (const key of TILE_YIELD_KEYS) {
    const excess = under[key] - base[key];
    if (excess <= 0) continue;
    inherited[key] = excess;
    inheritsAnything = true;
  }
  if (!inheritsAnything) return list;

  list.push({
    source: `${INHERITED_PREFIX} · ${inheritedSources(ground, inherited, base).join(' · ')}`,
    kind: 'add',
    ...inherited,
  });
  return list;
}

/**
 * Which of the ground's lines are the reason the centre inherits anything.
 *
 * The terrain line is the *effective* one — the last `base`/`override`, since a
 * hill replaces the forest that replaced the grass — and it is named only when
 * the ground it describes beats the base on its own. Every `add` line paying
 * into an inherited voice is named. Deduped and kept in the ground list's own
 * order, so the label reads in the order the rules resolved.
 */
function inheritedSources(
  ground: readonly TileYieldContribution[],
  inherited: TileYield,
  base: TileYield,
): string[] {
  const voices = TILE_YIELD_KEYS.filter((key) => inherited[key] > 0);

  let terrain: TileYieldContribution | undefined;
  for (const entry of ground) if (entry.kind !== 'add') terrain = entry;
  const terrainEarnsIt =
    terrain !== undefined && TILE_YIELD_KEYS.some((key) => terrain![key] > base[key]);

  const names: string[] = [];
  for (const entry of ground) {
    const earns =
      entry.kind === 'add'
        ? voices.some((key) => entry[key] > 0)
        : entry === terrain && terrainEarnsIt;
    if (!earns || names.includes(entry.source)) continue;
    names.push(entry.source);
  }
  // Unreachable while some line pays every voice the fold counted, and a label
  // reading "Inherited · " would be the visible half of that being wrong.
  return names.length > 0 ? names : ['the ground'];
}

/**
 * What the city centre pays. The fold of `explainCentreYield`, and nothing
 * else — the number and the explanation cannot drift apart.
 */
export function centreYield(state: GameState, city: City): TileYield {
  return foldTileYield(explainCentreYield(state, city));
}

// --- what a building pays ---------------------------------------------------

/**
 * One line of what a city's buildings pay it, and *why* — `explainTileYield`'s
 * shape one grade up the ladder, and rule 5 applied to the second yield source
 * that can be renewed by a technology.
 *
 * There is only one algebra here, unlike the tile chain: every entry **sums**. A
 * building is a thing standing in a town alongside the other things standing in
 * it, and nothing a technology does replaces what a granary was already worth.
 */
export interface BuildingYieldContribution {
  /** Display label: the building's name, or the technology that renewed it. */
  source: string;
  /** The building the line belongs to, so a caller may group by it. */
  building: BuildingId;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  /** Flat faith. Absent on the row means zero — see `BuildingDef.faith`. */
  faith: number;
  sciencePerPop: number;
}

/**
 * The ordered breakdown of one building's yield: what the table says it pays,
 * then one entry per renewal its owner has earned.
 *
 * Walked in the table's own order so two renewals on one building always read in
 * the same order, exactly as `explainTileYield` walks an improvement's (design
 * ledger, Entry I). A context is the *owner's* technologies and nothing else —
 * see `TileYieldContext`, which this deliberately reuses rather than growing a
 * near-identical twin: the question a renewal asks is the same question at both
 * scales.
 */
export function explainBuildingYield(
  id: BuildingId,
  ctx?: TileYieldContext,
): BuildingYieldContribution[] {
  const def = buildingDef(id);
  const list: BuildingYieldContribution[] = [
    {
      source: def.name,
      building: id,
      food: def.food,
      production: def.production,
      gold: def.gold,
      science: def.science,
      culture: def.culture,
      faith: def.faith ?? 0,
      sciencePerPop: def.sciencePerPop,
    },
  ];
  for (const upgrade of def.upgrades ?? []) {
    if (!ctx || !ctx.techs.includes(upgrade.tech)) continue;
    const { add } = upgrade;
    list.push({
      source: techDef(upgrade.tech).name,
      building: id,
      food: add.food ?? 0,
      production: add.production ?? 0,
      gold: add.gold ?? 0,
      science: add.science ?? 0,
      culture: add.culture ?? 0,
      faith: add.faith ?? 0,
      sciencePerPop: add.sciencePerPop ?? 0,
    });
  }
  return list;
}

/**
 * Every line every building in this city pays, in `city.buildings` order —
 * which is the order they were *built*, so the list a player reads this turn is
 * the list they read last turn with one more group on it.
 *
 * `hypothetical` is `cityYields`'s preview hook, carried through so that "what
 * would a library be worth here" is explained by the same list it is totalled
 * from. A candidate the city already has is skipped, exactly as it is there.
 */
export function explainCityBuildings(
  state: GameState,
  city: City,
  hypothetical: readonly BuildingId[] = [],
): BuildingYieldContribution[] {
  const ctx = cityContext(state, city);
  const list: BuildingYieldContribution[] = [];
  for (const id of city.buildings) list.push(...explainBuildingYield(id, ctx));
  for (const id of hypothetical) {
    if (city.buildings.includes(id)) continue;
    list.push(...explainBuildingYield(id, ctx));
  }
  return list;
}

/**
 * One thing a town would gain by finishing a building, as a player reads it.
 *
 * `BuildingYieldContribution`'s shape one question wider: that one is what a
 * building's *row* pays, this one is what the **city's yields** change by, which
 * is not the same list at all the moment a card is in play. `card` names the
 * Order, Doctrine, belief, legacy or wonder that spoke; `building` names the row
 * that did. Exactly one of the two is set on a line the game produces today, and
 * neither is set on the reconciliation line below.
 */
export interface BuildingPreviewLine {
  /** Display label: "Barracks", "God of the Forge", "Ore Tithes". */
  source: string;
  /** The building whose own row paid this, or absent. */
  building?: BuildingId;
  /** The card that paid this, or absent. */
  card?: CardId;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

function emptyPreviewLine(source: string): BuildingPreviewLine {
  return { source, food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
}

/** True when a preview line changes nothing. Such lines are never in a list. */
function previewPays(line: BuildingPreviewLine): boolean {
  return CITY_YIELD_KEYS.some((key) => line[key] !== 0);
}

/** The fold: every line **sums**. The only place a preview's total is computed. */
export function foldBuildingPreview(lines: readonly BuildingPreviewLine[]): CityYields {
  const total = emptyCityYields();
  for (const line of lines) for (const key of CITY_YIELD_KEYS) total[key] += line[key];
  return total;
}

/**
 * What this town's yields would gain if this building stood in it — the ordered,
 * **labelled** list the build screen prints beside a row a player is choosing
 * (user, 2026-08-28: "orders + religion benefits should show in city build
 * screen … preview for barracks in the city build list should show +1 prod").
 *
 * The question is not "what does a barracks pay" — `explainBuildingYield`
 * answers that off the table and would answer *nothing* for a barracks, which is
 * exactly the number the playtest complained about. It is "what would change
 * here", and since Statecraft and the pantheon that is a question about the
 * empire's whole law: a belief that pays a forge town a hammer, an Order that
 * counts barracks, a wonder whose tile line wants a granary. Every one of those
 * is a `hasBuilding` scope or a `countScaled` count, and every one of them is
 * invisible to a preview that reads the building's own row.
 *
 * **A ghost town, never a mutation.** The honest way to ask a conditional
 * question of an evaluator this large is to ask it twice: once of the city, once
 * of a *shallow copy* whose `buildings` array is the city's with the candidate
 * appended, and to take the difference. Nothing in `state` is touched, nothing
 * is cloned deeply, and — this is the point — no rule is reimplemented. A card
 * shape that does not exist yet is previewed correctly the day it is added,
 * because the thing being diffed is `cityYields` itself.
 *
 * The list, in the order a player reads it:
 *
 *   1. **the row's own lines** — the building and each renewal its owner has
 *      earned, `explainBuildingYield`'s list with the science-per-pop term
 *      resolved against this town's population, exactly as `cityYields` resolves
 *      it;
 *   2. **the flat card lines that woke up**, one per `(card, source)` whose
 *      figure differs between the two readings — which is a belief scoped to
 *      `hasBuilding`, a `countScaled` that counts the thing, and nothing else;
 *   3. **the tile lines that woke up**, summed over the tiles this town actually
 *      works: a granary's food on water, a wonder's desert line gated on a
 *      building. Grouped by source, because that is the name a player reads;
 *   4. **one reconciliation line, when the arithmetic needs it**, carrying the
 *      difference between the labelled lines above and the true change — which
 *      is Entry XVII's two multiplications doing their work on the new flats and
 *      any percentage the building itself unlocked. `applyRiders`' idiom in
 *      `purchase.ts`: a line of the list that holds *the difference it makes to
 *      the running figure*, never a multiplication performed afterwards.
 *
 * So `foldBuildingPreview(explainBuildingPreview(state, city, id))` is exactly
 * `cityYields(ghost) − cityYields(city)`, floors and stages included, which is
 * rule 5 read at the scale of a preview: the number on the row is the fold of
 * the reasons printed under it.
 *
 * A building the town already has previews as the empty list — there is nothing
 * to gain — and no caller has to special-case it.
 *
 * **No `toward`.** The reading is "what does this town make", not "how fast does
 * it build the next thing", so the production-category bonuses are deliberately
 * out: a barracks previewed with `toward` pointed at itself would report the
 * share of hammers it puts behind *units* as zero, which is true and useless.
 * `turnsToBuild` is where that question already lives.
 *
 * `quote` is `turnsToBuild`'s, for the same caller and the same reason: the
 * build list previews every unbuilt building in one town, and the *left* half of
 * every one of those diffs — what the town makes today — is one answer asked
 * thirty times. The ghost's half cannot be hoisted (a candidate is exactly what
 * changes it) and is not. See `CityQuote`.
 */
export function explainBuildingPreview(
  state: GameState,
  city: City,
  id: BuildingId,
  quote?: CityQuote,
): BuildingPreviewLine[] {
  if (city.buildings.includes(id)) return [];
  // The ghost. Shallow on purpose: every other field is shared with the real
  // town, and `buildings` is the one array that is replaced rather than pushed
  // to, so nothing downstream can write through it into `state`.
  const ghost: City = { ...city, buildings: [...city.buildings, id] };
  // The one thing the two readings below **cannot** disagree about, hoisted so
  // they are not asked for it twice: the meters sweep `state.cities`, the ghost
  // is not in that list, and a building the town has not built yet has changed
  // nothing about the empire's mood. Exact, not an approximation — see
  // `empirePercents`.
  const empire = quote?.empire ?? empirePercents(state, city.ownerId);

  const lines: BuildingPreviewLine[] = [];

  // 1. The row itself, read under the ghost's own context so a renewal this
  //    empire has earned is on the preview the turn the tech lands.
  for (const entry of explainBuildingYield(id, cityContext(state, ghost))) {
    const line = emptyPreviewLine(entry.source);
    line.building = id;
    line.food = entry.food;
    line.production = entry.production;
    line.gold = entry.gold;
    line.science = entry.science + Math.floor(city.population * entry.sciencePerPop);
    line.culture = entry.culture;
    line.faith = entry.faith;
    if (previewPays(line)) lines.push(line);
  }

  // 2. The cards that woke up. Keyed by card **and** source, because one card
  //    may pay a town twice under two labels (`countScaled`'s "×3" suffix), and
  //    walked in the ghost's order so the list reads in the evaluator's order.
  const before = new Map<string, CardYieldLine>();
  for (const line of cardCityYields(state, city)) before.set(`${line.card}\x00${line.source}`, line);
  for (const after of cardCityYields(state, ghost)) {
    const was = before.get(`${after.card}\x00${after.source}`);
    const line = emptyPreviewLine(after.source);
    line.card = after.card;
    for (const key of CITY_YIELD_KEYS) line[key] = after[key] - (was?.[key] ?? 0);
    if (previewPays(line)) lines.push(line);
  }

  // 3. The ground. A building may change what a *tile* pays — the granary's
  //    food on water, a scoped card line — and that arrives through the
  //    context rather than through any list above, so it is diffed where it
  //    lands: per worked tile, per source, summed. Only `add` entries can
  //    differ (terrain and features do not care what has been built), which is
  //    what makes a diff by source exact rather than approximate.
  const groundBefore = cityContext(state, city);
  const groundAfter = cityContext(state, ghost);
  const ground = new Map<string, BuildingPreviewLine>();
  const order: string[] = [];
  for (const cell of city.workedTiles) {
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) continue;
    const was = addsBySource(explainTileYield(tile, groundBefore));
    for (const entry of explainTileYield(tile, groundAfter)) {
      if (entry.kind !== 'add') continue;
      let line = ground.get(entry.source);
      if (!line) {
        line = emptyPreviewLine(entry.source);
        ground.set(entry.source, line);
        order.push(entry.source);
      }
      const old = was.get(entry.source);
      for (const key of CITY_YIELD_KEYS) line[key] += entry[key] - (old?.[key] ?? 0);
    }
  }
  for (const source of order) {
    const line = ground.get(source)!;
    if (previewPays(line)) lines.push(line);
  }

  // 4. The reconciliation. Everything the labelled lines above cannot name: the
  //    two stages multiplying the new flats, a percentage the building itself
  //    unlocked, the city centre's inherit rule, and every floor on the way.
  //    Appended only when it is not zero, so a town with no percentages at all
  //    reads a list of nothing but named reasons.
  const gain = emptyCityYields();
  const after = cityYields(state, ghost, [], undefined, cityQuote(state, ghost, [], empire));
  const now = cityYields(state, city, [], undefined, quote);
  for (const key of CITY_YIELD_KEYS) gain[key] = after[key] - now[key];
  const named = foldBuildingPreview(lines);
  const rest = emptyPreviewLine('Multipliers and rounding');
  for (const key of CITY_YIELD_KEYS) rest[key] = gain[key] - named[key];
  if (previewPays(rest)) lines.push(rest);

  return lines;
}

/**
 * One tile's `add` contributions, summed by source — the shape the preview's
 * ground diff subtracts. Merged by source for `explainTileYield`'s own reason:
 * one card can speak twice about one hex and a player reads one name.
 */
function addsBySource(list: readonly TileYieldContribution[]): Map<string, TileYield> {
  const map = new Map<string, TileYield>();
  for (const entry of list) {
    if (entry.kind !== 'add') continue;
    let sum = map.get(entry.source);
    if (!sum) {
      sum = emptyTileYield();
      map.set(entry.source, sum);
    }
    for (const key of TILE_YIELD_KEYS) sum[key] += entry[key];
  }
  return map;
}

// --- what the empire multiplies ---------------------------------------------

/**
 * One percentage a building puts behind a *particular* thing a city is building.
 *
 * The building-scale sibling of `MeterEffect` (`meters.ts`) and the same shape
 * for the same reason: rule 5 applies to modifiers too, so the city panel prints
 * one line per entry and the multiplier below is the fold of the same list. An
 * effect worth zero percent is never in it.
 */
export interface ProductionModifier {
  /** Display label: the building's or the resource's name. */
  source: string;
  /** The building this line belongs to, or absent for a resource's line. */
  building?: BuildingId;
  /** The resource this line belongs to, or absent for a building's line. */
  resource?: ResourceId;
  /** Signed percent, as a figure a surface prints rather than a fraction. */
  percent: number;
  /**
   * Always `'city'` — Entry XVII's city stage. Carried rather than assumed so
   * that the panel folds one shape for every percentage it prints, and so the
   * classification is written down where a reader will look for it: a category
   * bonus is a share of the hammers **this town** puts behind **this build**, so
   * it multiplies with the town's other bonuses even when the row that grants it
   * is empire-scoped. Marble is the case that makes the point — "+15% toward
   * buildings in every city" is still a fact about each city's build, exactly as
   * a barracks is, and Entry XVII.4 stages an effect by where it applies.
   */
  stage: ModifierStage;
}

/**
 * Everything currently putting extra hammers behind `toward` — the buildings in
 * `BUILDING_IDS` order, then the city's own improved luxuries in resource-table
 * order.
 *
 * Empty for an empty queue, and otherwise a *list over two tables* rather than a
 * lookup of the barracks: both declare the same `{ category, percent }` shape,
 * so the second such building and the first such luxury are data rows and not
 * second branches. There is no barracks case and no marble case anywhere in the
 * simulation. That generalisation is the whole reason the old unit-only
 * `unitProductionBonus` was widened rather than given a sibling — see
 * `buildingData.ts`.
 *
 * `hypothetical` mirrors `cityYields`'s: a barracks the city does not have yet
 * has to be priced by the same function, or the tech screen's "what would this
 * be worth" would quietly answer zero. There is no hypothetical resource,
 * because nothing previews owning one.
 */
/**
 * Which bonus category a queue row belongs to, or `null` for a row no
 * percentage may name.
 *
 * **The one place a queue item's kind is read as a bonus category**, and the one
 * place the two vocabularies are allowed to differ (`QueueKind` in `state.ts` is
 * what a city may build; `ProductionCategory` in `buildingData.ts` is what a
 * bonus may name). Two rows map to something other than their kind:
 *
 *   · a **project** maps to `null`. Its rate is a printed conversion (Entry
 *     XXVI) — a barracks putting ten percent behind Tithes would be a barracks
 *     minting money — so a city building one carries no category bonus at all,
 *     which is exactly what an empty list means to `cityYields`.
 *   · a **wonder** is a `'building'` row that maps to `'wonder'`. A wonder is
 *     built out of the same basket by the same routine, but it is its own
 *     category so that a percentage can name it (the ratified great-person
 *     legacies say "+30%⚙ toward wonders") — and, symmetrically, so that a
 *     barracks-shaped "+15% toward buildings" does *not* quietly ride on one.
 */
export function queueCategory(item: QueueItem): ProductionCategory | null {
  if (item.kind === 'project') return null;
  if (item.kind === 'building') return isWonder(item.id) ? 'wonder' : 'building';
  return 'unit';
}

export function productionModifiers(
  state: GameState,
  city: City,
  toward?: QueueItem | null,
  hypothetical: readonly BuildingId[] = [],
): ProductionModifier[] {
  if (!toward) return [];
  const category = queueCategory(toward);
  if (category === null) return [];
  const list: ProductionModifier[] = [];
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id) && !hypothetical.includes(id)) continue;
    const bonus = buildingDef(id).productionBonus;
    if (bonus === undefined || bonus.percent === 0 || bonus.category !== category) continue;
    list.push({
      source: buildingDef(id).name,
      building: id,
      percent: bonus.percent,
      stage: 'city',
    });
  }
  for (const line of resourceProduction(state, city, category)) {
    if (line.percent === 0) continue;
    list.push({
      source: line.source,
      resource: line.resource,
      percent: line.percent,
      stage: 'city',
    });
  }
  // A card's hammers behind this category — and behind *this unit*, when the row
  // narrows to one silhouette (The Great Warring Tribes' mounted line). The item
  // is passed through so the narrowing is asked of what the city is actually
  // building; there is no Conscription case anywhere in this file.
  const unitType = toward.kind === 'unit' && isUnitTypeId(toward.id) ? toward.id : undefined;
  // And behind *this building*, when the row names one (Mimar Sinan's mosques).
  // `unitType`'s sibling and passed for its reason exactly: the narrowing is
  // asked of what the city is actually building.
  const buildingId =
    toward.kind === 'building' && isBuildingId(toward.id) ? toward.id : undefined;
  for (const line of cardProduction(state, city, category, unitType, buildingId)) {
    if (line.percent === 0) continue;
    list.push({ source: line.source, percent: line.percent, stage: 'city' });
  }
  return list;
}

/**
 * The percentage points these modifiers add to the city stage: summed, never
 * multiplied. The fold of the list above, handed to `withStage` so that the
 * hammers behind a build and the percentages on the yield meet in one place.
 */
export function modifierPercent(list: readonly ProductionModifier[]): number {
  let percent = 0;
  for (const entry of list) percent += entry.percent;
  return percent;
}

/**
 * One percentage standing on one of a city's yields, whatever put it there.
 *
 * `ProductionModifier` is the same idea for the *thing being built*; this is the
 * idea for the yield itself, and it exists because since the luxuries pass there
 * are two families of source — the two empire meters and a luxury's
 * `percentYields` — which must land in **two sums, each applied once** (Entry
 * XVII, the modifier doctrine). A gems empire at +10% gold and a contented one
 * at +10% science are lines of one list rather than two multiplications; the
 * stage they carry decides which of the two sums each joins.
 */
export interface CityYieldPercent {
  /** Display label: "Happiness +7", "Gems", "Coral · coastal city". */
  source: string;
  yield: CityYieldKey;
  /** Signed whole percent. */
  percent: number;
  /**
   * Which multiplication this line joins. A meter tier is always `'empire'` —
   * it is the empire's mood, not the town's — and a luxury's is whatever its
   * scope says (`scopeStage` in `resourceEffects.ts`).
   */
  stage: ModifierStage;
  /** The meter this line came from, or absent for a resource's line. */
  meter?: MeterId;
  /** The resource this line came from, or absent for a meter's line. */
  resource?: ResourceId;
}

/**
 * The percentage lines a city inherits from its **empire** rather than earns for
 * itself: the two meter tiers, and the arrears penalty on a treasury under
 * water.
 *
 * A pure function of `(state, playerId)` — nothing about the town is consulted,
 * which is exactly what makes it hoistable and, more usefully, what makes it
 * *shareable between a town and a ghost of it* (`explainBuildingPreview`): the
 * meters sweep `state.cities`, and a shallow copy with one more building in its
 * `buildings` array is not in that list, so the empire's half of a ghost's
 * percentages is the empire's half of the real town's by construction.
 *
 * Two lists rather than one because they are not adjacent: the meters lead
 * `cityYieldPercents` and arrears closes it, with the town's own luxuries and
 * cards between. Order there is presentation and the panel prints it, so the
 * split keeps the seam invisible.
 */
export interface EmpirePercents {
  /** The two meter tiers, in `meterEffects` order — the head of the list. */
  meters: CityYieldPercent[];
  /** Arrears, or empty on a solvent treasury — the foot of the list. */
  arrears: CityYieldPercent[];
}

export function empirePercents(state: GameState, playerId: number): EmpirePercents {
  const meters: CityYieldPercent[] = [];
  for (const effect of meterEffects(state, playerId)) {
    if (effect.growth) continue;
    for (const id of effect.yields) {
      meters.push({
        source: effect.meter === 'happiness' ? 'Happiness' : 'Authority',
        yield: id,
        percent: effect.percent,
        // A tier is the empire leaning on every city at once: the global stage,
        // whichever meter it came from (Entry XVII.4, and XVII.5's whole point —
        // the meters are what the global stage is *for*).
        stage: 'empire',
        meter: effect.meter,
      });
    }
  }
  // **Arrears** (the maintenance ruling, 2026-08-28). A treasury under water
  // costs the empire a quarter of its science and its culture, and it joins
  // `cityYieldPercents` at the **empire** stage rather than being a
  // multiplication somewhere downstream — which is the whole of Entry XVII and
  // the whole reason the ruling asked for it there: −25% arrears on top of a
  // −15% authority tier is −40% of base, once, and never ×0.75 × 0.85.
  //
  // Science and culture and nothing else. Gold is untouched on purpose — an
  // empire in debt must be able to earn its way out — and so are food and
  // hammers, because starving a bankrupt empire's cities is a spiral rather than
  // a penalty. What it taxes is the two things an empire in trouble was
  // *saving* for.
  const arrears: CityYieldPercent[] = [];
  const owner = playerById(state, playerId);
  if (owner && treasuryInDebt(owner) && RULES.upkeep.debtPercent !== 0) {
    for (const key of ['science', 'culture'] as const) {
      arrears.push({
        source: 'Treasury in debt',
        yield: key,
        percent: RULES.upkeep.debtPercent,
        stage: 'empire',
      });
    }
  }
  return { meters, arrears };
}

/**
 * Everything currently multiplying this city's yields: the two meters first, in
 * `meterEffects` order, then the empire's luxuries in resource-table order.
 *
 * Order is presentation, not arithmetic — a line's `stage` decides when it
 * applies, and `stageSumsFor` is what folds the list into the two figures
 * `cityYields` uses. The meters are first because they are the loudest, not
 * because they are first to bite; they are in fact last.
 *
 * The growth stifle is deliberately **not** here. It multiplies food *surplus*
 * toward growth rather than a yield (design ledger, Entry XIV.D.4), which is a
 * different rule with a different consumer — `growthSurplus`, which reads it
 * from `meterEffects` directly.
 */
export function cityYieldPercents(
  state: GameState,
  city: City,
  empire: EmpirePercents = empirePercents(state, city.ownerId),
): CityYieldPercent[] {
  const list: CityYieldPercent[] = [...empire.meters];
  for (const line of resourcePercentYields(state, city)) {
    if (line.percent === 0) continue;
    list.push({
      source: line.source,
      yield: line.yield,
      percent: line.percent,
      stage: line.stage,
      resource: line.resource,
    });
  }
  // And the empire's law. A card joins this list with a stage exactly as a
  // luxury does — never a multiplication of its own afterwards (Entry XVII) —
  // so a Doctrine that is the third source of a percentage on food is a third
  // line in one of two sums.
  for (const line of cardPercentYields(state, city)) {
    if (line.percent === 0) continue;
    list.push({ source: line.source, yield: line.yield, percent: line.percent, stage: line.stage });
  }
  // And the arrears, at the foot — see `empirePercents`, which is where the two
  // empire-scale lines live now that a screen may want them hoisted.
  list.push(...empire.arrears);
  return list;
}

/**
 * The percentages on one yield, as Entry XVII's two sums. The only sum of them,
 * and the only shape anything downstream is given: there is deliberately no
 * function returning "the total percentage on gold", because since the doctrine
 * that number does not exist — +10% city and +10% empire is ×1.21, and a caller
 * handed 20 would be a caller quietly reinstating the old single pool.
 */
export function stageSumsFor(
  list: readonly CityYieldPercent[],
  yieldId: CityYieldKey,
): StageSums {
  return foldStages(list, (entry) => entry.yield === yieldId);
}

/**
 * Every multiplication standing on this city right now, folded per yield into
 * Entry XVII's two stages — the figures `cityYields` multiplies by and the
 * figures the panel prints as its two stage lines.
 *
 * One evaluator for both, which is the doctrine's rule 6 taken seriously: a
 * panel that summed the stages itself would be a second implementation of the
 * staging, and the first thing a second implementation does is disagree about
 * the hammers. `toward` is why it could: the city stage on **production**
 * carries whatever the buildings and seams put behind *this particular build*
 * (`productionModifiers`), so the stage sums are a fact about the pair (city,
 * item) exactly as `cityYields` is.
 *
 * `percents` may be handed in by a caller that already has the list — a screen
 * pricing forty rows against one town (`CityQuote`). It is the same call this
 * would make and it is *not* a fact about the item, which is the whole reason it
 * can be hoisted out of a loop over items; see `cityQuote` for its lifetime.
 */
export function cityStageSums(
  state: GameState,
  city: City,
  toward?: QueueItem | null,
  hypothetical: readonly BuildingId[] = [],
  percents: readonly CityYieldPercent[] = cityYieldPercents(state, city),
): Record<CityYieldKey, StageSums> {
  const hammers = modifierPercent(productionModifiers(state, city, toward, hypothetical));
  // The Great Warring Tribes' first clause, and the only place a card takes a
  // *meter line* off the table rather than adding one. It is asked here because
  // here is the one evaluator that knows both the empire's percentages and what
  // the town is building — "a torn writ no longer slows production toward units"
  // is a fact about the pair (city, item), which is exactly what `cityStageSums`
  // is a fact about. The line is dropped, not zeroed, so the panel stops
  // printing a malus that is not being charged.
  const exemptUnits =
    toward?.kind === 'unit' && cardMeterFlag(state, city.ownerId, 'authorityUnitProductionExempt');
  const live = exemptUnits
    ? percents.filter(
        (line) => !(line.meter === 'authority' && line.yield === 'production' && line.percent < 0),
      )
    : percents;
  const sums = {} as Record<CityYieldKey, StageSums>;
  for (const key of CITY_YIELD_KEYS) {
    const staged = stageSumsFor(live, key);
    // The hammers join the city stage rather than standing beside it: a barracks
    // is a fact about the town in exactly the way marble and a market are.
    sums[key] = key === 'production' ? withStage(staged, 'city', hammers) : staged;
  }
  return sums;
}

/**
 * Everything a city produces this turn: the centre, plus every worked tile, plus
 * the flat effects of its buildings.
 *
 * Science and culture are not tile yields at all — they come from population and
 * from buildings — which is why they appear here and nowhere in the terrain
 * tables. Each building's `sciencePerPop` is floored *on its own* so that two
 * half-science buildings pay for two halves rather than rounding into a free
 * point, and the population term is floored the same way for the same reason.
 *
 * Reads `city.workedTiles` rather than re-assigning, so a caller can ask what a
 * city *currently* makes without changing it. The turn pipeline assigns first.
 *
 * `hypothetical` is the one-evaluator hook (Entry VIII): buildings the city does
 * *not* have, counted as if it did. It exists so that "what would a library be
 * worth here?" is answered by the function the turn pipeline banks — a preview
 * computed by a second implementation is a preview that can lie. Callers hand it
 * a candidate list and diff the two results; nothing is cloned and nothing is
 * mutated. See `buildingYieldDelta` in `tech.ts`.
 *
 * `toward` is what the city is putting its hammers behind, and the *only* thing
 * it changes is production. A barracks pays a share of the city's hammers toward
 * a unit and nothing toward a monument (`productionBonus`), so the honest
 * production rate is a fact about the pair rather than about the city — and it
 * is answered here, inside the one evaluator, rather than by a second
 * multiplication somewhere downstream. `collectYields` banks at the rate for
 * whatever is at the *front* of the queue, `turnsToBuild` divides by the rate for
 * the item it is asked about, and the panel prints that same number with the
 * modifier named beside it (`productionModifiers`). Omitting it is the reading
 * for anything asking about the city rather than about a build — science, gold,
 * the top bar's totals — and costs nothing, because a city with no such building
 * has one rate either way.
 *
 * Which is why the *body* of this function is one multiplication and the flats
 * live next door in `cityQuote`: everything above the staging is a fact about
 * the town and nothing above it is a fact about the item. A caller with one
 * town and many rows takes the quote once and hands it back; the fold — this
 * function — is unmoved, and the printed number is still its answer.
 *
 * The empire's thumb on the scale
 * ------------------------------
 * Happiness and authority land *here*, at the very end, and that is the whole of
 * how they touch the economy (design ledger, Entry XIV). Since Entry XVII they
 * land in the *second* of two multiplications: everything the town did for
 * itself — its buildings' category bonuses, a seam it holds, a coastal
 * signature — is summed and applied first, and then the empire's mood multiplies
 * the result, `(base + flats) × (1 + Σ city%) × (1 + Σ global%)`, floored once
 * at the very end (`applyStages` in `modifiers.ts`).
 *
 * Additive within a stage and multiplicative across the pair, which is the whole
 * doctrine: two city bonuses of +10% and +15% are +25% and never ×1.10 × 1.15,
 * while a +10% writ on top of that +25% is worth 37.5 points of base rather than
 * 35 — a global modifier scales with how well-built the cities under it are.
 * Floor-once is the same rule the science-per-pop terms above keep, so a +10% on
 * 7 hammers is 7 and not a rounding gift, and a barracks in an overstretched
 * empire is two multiplications and still one rounding.
 *
 * Applying it inside this function rather than in the turn phase is the point:
 * `turnsToBuild`, the city panel, the top bar's totals, the tech screen's rate
 * and the pipeline that banks the numbers all read one evaluator, so an empire
 * whose writ is overstretched sees the slower build estimate *before* it ends
 * the turn. The city panel prints the active modifiers as their own lines, which
 * is rule 5 read at empire scale: the multiplied number is never shown without
 * the reason beside it.
 */
export function cityYields(
  state: GameState,
  city: City,
  hypothetical: readonly BuildingId[] = [],
  toward?: QueueItem | null,
  quote: CityQuote = cityQuote(state, city, hypothetical),
): CityYields {
  // Entry XVII, and the only place in the simulation a yield meets a percentage.
  // The hammers behind *this build* join the city stage rather than standing
  // beside it, because a barracks is a fact about the town in exactly the way
  // marble and a market are; the meters wait for the second multiplication.
  const sums = cityStageSums(state, city, toward, hypothetical, quote.percents);
  const total: CityYields = { ...quote.flats };
  for (const key of CITY_YIELD_KEYS) total[key] = applyStages(total[key], sums[key]);
  return total;
}

/**
 * Everything about a city's yields that is **not** about what it is building:
 * the flats before any percentage has touched them, and the percentages
 * themselves.
 *
 * `cityYields` is this plus one multiplication. The split exists because the
 * two halves are asked at wildly different rates: a screen pricing a build list
 * asks "how long would *this* take" of forty rows against one town, and the
 * only thing that differs between the forty is `productionModifiers` — the
 * centre, the worked tiles, the luxuries, the routes, the palace, the buildings
 * and, above all, `cityYieldPercents` (which walks the whole empire twice for
 * the two meters) are the same answer forty times over. Hoisting them is
 * `tileOwnerField`'s bargain read one system across: the loop pays for the
 * empire once instead of once per row.
 *
 * **It is an input, never an answer.** Nothing prints a quote; the printed
 * number is still `cityYields`', computed by the one arithmetic, off a quote
 * handed in rather than one taken. That is rule 5's "a hoisted figure must be
 * the same function's answer handed in" kept honestly: what is hoisted here is
 * the *ingredients*, and the fold stays where it was.
 *
 * **Its lifetime is one sweep** — `zocField`'s and `tileOwnerField`'s rule, and
 * for their reason. A quote is a photograph of one city under one `hypothetical`
 * at one instant; hand it back after anything has been banked, claimed, chopped
 * or slotted and it will answer with the town the state has moved past. Take
 * one at the top of a loop, spend it inside, and let it go.
 */
export interface CityQuote {
  /**
   * The six yields as they stand before Entry XVII's two multiplications — the
   * fold of every flat source, in `cityQuote`'s order.
   */
  flats: CityYields;
  /** `cityYieldPercents`' list for this town, which is a fact about the town. */
  percents: readonly CityYieldPercent[];
  /**
   * The empire's half of that list, kept apart so it can be lent to a *ghost*
   * of this town — see `empirePercents` for why that is exact rather than
   * approximate.
   */
  empire: EmpirePercents;
}

export function cityQuote(
  state: GameState,
  city: City,
  hypothetical: readonly BuildingId[] = [],
  empire: EmpirePercents = empirePercents(state, city.ownerId),
): CityQuote {
  const centre = centreYield(state, city);
  const total: CityYields = {
    food: centre.food,
    production: centre.production,
    gold: centre.gold,
    // The centre's own science and culture ride on top of what a city makes just
    // by being one: a town founded on a tea hill keeps the beaker.
    science: Math.floor(city.population * CITIES.sciencePerPop) + centre.science,
    culture: CITIES.baseCulturePerCity + centre.culture,
    faith: centre.faith,
  };

  const ctx = cityContext(state, city);
  for (const cell of city.workedTiles) {
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) continue;
    const value = tileYieldOf(tile, ctx);
    for (const key of TILE_YIELD_KEYS) total[key] += value[key];
  }

  // What the city's own improved luxuries pay it, the fold of the list the panel
  // prints line by line (`resourceEffects.ts`). Before the buildings only
  // because a seam in the ground is older than a market built over it; the sum
  // is the same either way.
  // What this empire's Statecraft cards pay this town, the fold of the list the
  // panel prints line by line (`cardCityYields`). Beside the luxuries because
  // they are the same kind of thing one table over.
  for (const line of cardCityYields(state, city)) {
    total.food += line.food;
    total.production += line.production;
    total.gold += line.gold;
    total.science += line.science;
    total.culture += line.culture;
    total.faith += line.faith;
  }

  for (const line of cityResourceYields(state, city)) {
    total.food += line.food;
    total.production += line.production;
    total.gold += line.gold;
    total.science += line.science;
    total.culture += line.culture;
    total.faith += line.faith;
  }

  // What the town's guilds pay it (Entry XLVIII), one line per family that has
  // anybody — folded here rather than added downstream so a scholar's beakers
  // are staged by Entry XVII exactly as a library's are, reach the pool through
  // the same `collectYields`, and appear in the panel's ledger with their reason
  // beside them. A specialist is a citizen who stopped working a hex: the tile
  // he left is already missing from `workedTiles` above, so this is a
  // substitution and never a bonus.
  for (const line of citySpecialistYields(city)) {
    total.food += line.food;
    total.production += line.production;
    total.gold += line.gold;
    total.science += line.science;
    total.culture += line.culture;
    total.faith += line.faith;
  }

  // What the caravans sent *to* this town are bringing, the fold of the list
  // the panel prints line by line (`explainRouteYield` in `routeYields.ts`) — off
  // each caravan's *origin* buildings, since 2026-08-27's reversal pays the
  // destination and reads the origin. Beside the luxuries and the cards
  // because it is the same kind of thing a third table over — and *inside*
  // this function rather than beside it, so a route's food is staged like
  // every other flat (Entry XVII) and its gold reaches the treasury through
  // the same `collectYields` as the market's.
  for (const line of cityRouteYields(state, city)) {
    total.food += line.food;
    total.production += line.production;
    total.gold += line.gold;
  }

  // The seat of government, folded like every other list rather than added as a
  // term — and *inside* this function, so the palace's coin is staged like a
  // market's (Entry XVII) and reaches the treasury through the same
  // `collectYields`. Empty in every city but one. See `explainPalaceYield`.
  for (const line of explainPalaceYield(state, city)) total.gold += line.gold;

  // The fold of `explainCityBuildings`, and the only place a building's worth is
  // summed — a candidate the city already has is skipped in there, because a
  // preview that promised a second library would be a preview that lies.
  for (const entry of explainCityBuildings(state, city, hypothetical)) {
    total.food += entry.food;
    total.production += entry.production;
    total.gold += entry.gold;
    total.culture += entry.culture;
    total.science += entry.science;
    // The shrine and the temple are why this line exists: a building may pay
    // faith since 2026-08-26, and faith is banked into `Player.faithPool` by
    // `collectYields` like every other source of it.
    total.faith += entry.faith;
    // Floored per *entry* rather than per building, which is the same rule the
    // old per-building floor was: two half-science sources must pay for two
    // halves rather than round into a free point.
    total.science += Math.floor(city.population * entry.sciencePerPop);
  }

  // The percentages are gathered, never applied: the multiplication is `cityYields`'
  // one line, and it is the only place in the simulation a yield meets a percentage.
  return { flats: total, percents: cityYieldPercents(state, city, empire), empire };
}

/** What the citizens eat: `foodPerCitizen` each. */
export function foodUpkeep(city: City): number {
  return city.population * CITIES.foodPerCitizen;
}

/**
 * What one city's basket lost this resolution, and what became of it
 * (`sieges`' sibling, and `disbanded`'s: the maintenance ruling's shape read
 * two systems over).
 *
 * A *difference*, exactly like every other `TurnReport` field — by the time
 * `runEndOfTurn` returns the basket has simply moved, `city.foodBasket` reads
 * whatever the deficit and (maybe) the shrink left it at, and no diff of two
 * boards can say whether a town lost food this turn or merely spent a healthy
 * surplus on nothing. `lost` is reported **positive** (the bushels the basket
 * gave up), never the signed surplus, because "Uruk is starving" is a loss and
 * the toast that prints it should never have to negate a number first.
 *
 * Written in two passes, because the two phases answer two different
 * questions. `collectYields` pushes the entry the instant `growthSurplus`
 * comes back negative — that is *all* a deficit says on its own — with
 * `shrank: false` and this turn's `population`, since nothing has happened to
 * either yet. `growCities`, which runs after and is the only place a citizen is
 * actually taken, finds the same entry by `cityId` and corrects `shrank` and
 * `population` if the basket in fact ran dry. A city whose deficit this turn
 * did not reach the floor keeps the entry `collectYields` wrote — it lost
 * food, and nobody starved.
 *
 * `ejected` is the user's addendum of the same day: the display names of any
 * queue rows `growCities` set aside because the shrink dropped the city below
 * their `minCityPop` (a settler, most often) — empty when the shrink evicted
 * nothing, which is every starving city that never crossed the floor and most
 * that did.
 */
export interface StarvationReport {
  cityId: number;
  ownerId: number;
  lost: number;
  shrank: boolean;
  population: number;
  ejected: string[];
}

/**
 * What a city actually banks toward its next citizen this turn.
 *
 * The one evaluator for the growth rate: `collectYields` adds this to the
 * basket, and the city panel's Growth line quotes it. Three things happen to the
 * harvest on the way, in this order, and each is a different rule:
 *
 *   1. the citizens eat (`foodUpkeep`), which is what makes this a *surplus*;
 *   2. a settler at the front of the queue eats the growth (`growthIsHalted`) —
 *      the city banks nothing positive, and a deficit still bites;
 *   3. a happiness deficit throttles what is left.
 *
 * The stifle multiplies the **surplus and only the surplus**, never the food
 * yield itself (design ledger, Entry XIV.D.4). That is the difference between an
 * unhappy empire that stops growing and an unhappy empire that starves, and only
 * the first is a legal gambit: at the ladder's worst rung the surplus goes to
 * zero and the city sits exactly where it is, while a city already in deficit is
 * untouched by the meter — its debt is its own.
 *
 * `yields` may be passed in by a caller that has already computed them, which
 * the turn phase has; the default is the same call it would make.
 */
export function growthSurplus(
  state: GameState,
  city: City,
  yields: CityYields = cityYields(state, city),
): number {
  let surplus = yields.food - foodUpkeep(city);
  if (growthIsHalted(city)) surplus = Math.min(0, surplus);
  if (surplus <= 0) return surplus;
  // **One channel, one sum, one multiplication.** The meters' stifle and every
  // card that speaks to `growthSurplus` (the Hanging Gardens) are additive
  // percentages on the same figure, exactly as Entry XVII's stages are additive
  // within a stage — a −25% stifle and a +25% wonder have to read as nothing at
  // all, which they do not if they are multiplied one after the other. Floored
  // at zero for `growthFactor`'s reason: the worst any of this may do is stall a
  // city, never eat it.
  const percent =
    growthPercent(meterEffects(state, city.ownerId)) +
    foldCardRulePercent(cardRulePercent(state, city.ownerId, 'growthSurplus', city));
  const factor = Math.max(0, 1 + percent / 100);
  // Floored, so the basket stays whole: the panel prints it, the threshold is a
  // whole number, and a fraction of a bushel banked forever is a fraction that
  // eventually decides a growth turn nobody can account for. Applied **whatever
  // the factor is**: it used to be skipped at 1 or above, which was exactly
  // right while the meters were the only source and could only ever stifle, and
  // silently ate the first card that pushed the other way. A factor of exactly 1
  // still leaves a whole surplus untouched, so a game where nobody holds such a
  // card banks what it always banked.
  return Math.floor(surplus * factor);
}

/**
 * True when the front of the queue stops the city banking food toward growth —
 * a settler under construction, today. Starvation is unaffected: halting growth
 * is not immunity from a deficit.
 */
export function growthIsHalted(city: City): boolean {
  const front = city.queue[0];
  if (!front || front.kind !== 'unit' || !isUnitTypeId(front.id)) return false;
  return unitDef(front.id).haltsGrowth;
}

/** Food a city of this size must bank to gain a point. See `CityRules`. */
export function growthThreshold(population: number): number {
  const steps = Math.max(0, population - 1);
  return Math.floor(
    CITIES.growthBase + CITIES.growthLinear * steps + steps ** CITIES.growthExponent,
  );
}

/** Culture the next border tile costs a city that has claimed `tilesClaimed`. */
export function nextBorderCost(tilesClaimed: number): number {
  const steps = Math.max(0, tilesClaimed);
  return Math.floor(CITIES.borderCostBase + CITIES.borderCostLinear * steps ** CITIES.borderCostExponent);
}

/**
 * What the next border tile actually costs **this** city: the curve, less
 * whatever its empire's luxuries take off it.
 *
 * The one evaluator, so the culture `expandBorders` spends and any figure a
 * surface quotes are the same number. `nextBorderCost` stays the pure curve
 * beside it — it is a fact about the *n*-th tile and nothing else — and this is
 * the fact about the n-th tile of a particular empire. Floored at one, because a
 * border tile that costs nothing would let a city claim one every turn forever.
 */
export function borderCostFor(state: GameState, city: City): number {
  const base = nextBorderCost(city.tilesClaimed);
  const percent =
    foldRulePercent(resourceRulePercent(state, city.ownerId, 'borderCost')) +
    foldCardRulePercent(cardRulePercent(state, city.ownerId, 'borderCost'));
  if (percent === 0) return base;
  return Math.max(1, Math.floor(base * (1 + percent / 100)));
}

/**
 * Turns to bank `remaining` at `perTurn`, or `null` when it will never happen.
 * A display helper, but it lives here so the panel's arithmetic and the
 * simulation's cannot disagree.
 */
export function turnsToFill(remaining: number, perTurn: number): number | null {
  if (remaining <= 0) return 0;
  if (perTurn <= 0) return null;
  return Math.ceil(remaining / perTurn);
}

/**
 * Where a city's borders stand and how fast they are moving — the one evaluator
 * for border growth, folded by the turn phase and printed by the city panel.
 *
 * Entry XIV's horizontal half made concrete: **authority owns land**. The
 * culture a city makes is banked twice, into two different accounts — all of it
 * into `Player.culturePool`, which civics will eventually spend, and only
 * `perTurn` of it into `City.culture`, which buys ground. The writ is the
 * difference between the two figures.
 *
 * Three things happen to the harvest on the way, in this order:
 *
 *   1. the city makes its culture (`cityYields`, which has already had the
 *      happiness bonus and any authority malus applied to the *yield*);
 *   2. the writ's border factor multiplies it (`borderFactor`) — the same
 *      ±10/20% tier the meters already compute, summed-then-applied like every
 *      other percentage in this game;
 *   3. a writ in deficit freezes it outright, at any deficit at all.
 *
 * The result is floored, and a +10% on 3 culture is therefore 3 rather than a
 * rounding gift — the same rule `cityYields` keeps for a barracks' hammers, and
 * for the same reason. The writ's bonus is felt by cities that actually make
 * culture, which is the tuning intent: a monument town is not meant to sprint.
 *
 * `frozen` is a *state*, not a rate of zero, and it is carried separately from
 * `perTurn` so no surface has to infer it. A frozen city still banks its culture
 * into the empire's pool and still keeps whatever it had already banked toward
 * the next tile — the freeze stops the border moving, it does not confiscate.
 *
 * `yields` may be passed in by a caller that has already computed them, which
 * the turn phase has; the default is the same call it would make.
 */
export interface BorderGrowth {
  /** Culture the city makes this turn, before the writ touches it. */
  base: number;
  /** Signed whole percent the meters put on the accrual. */
  percent: number;
  /** True when the empire's writ is in deficit: no accrual, and no purchases. */
  frozen: boolean;
  /** What actually banks toward the next tile this turn. */
  perTurn: number;
  /** What is already banked. */
  banked: number;
  /** What the next tile costs this city, luxuries included (`borderCostFor`). */
  cost: number;
  /**
   * Turns until the next tile at the current rate, `null` when it will never
   * arrive — a frozen empire, or a city with no culture at all.
   */
  turns: number | null;
}

export function borderGrowth(
  state: GameState,
  city: City,
  yields: CityYields = cityYields(state, city),
): BorderGrowth {
  const effects = meterEffects(state, city.ownerId);
  // The one card family that can thaw a frozen border: Emergency Powers, gated
  // on the writ being torn in the first place. A `meterRule` flag rather than a
  // percentage, because "borders do not freeze" is not a rate.
  const exempt = cardMeterFlag(state, city.ownerId, 'borderFreezeExempt');
  const frozen = bordersFrozen(effects) && !exempt;
  // Border culture is its **own channel** (Entry XVII: not in the two-stage
  // pipeline), so a card's percentage on it sums with the meter's and is applied
  // once, here — never in `cityYieldPercents`, which is about a yield.
  // The **city** is handed in, so this town's own live rites join the empire's
  // law in the same fold: Consecration of the Bounds is a `rulePercent` on
  // `borderCulture` that hangs here for twenty turns (Entry XXVIII), and it
  // sums with a Doctrine's rather than multiplying after it.
  const cardPercent = foldCardRulePercent(
    cardRulePercent(state, city.ownerId, 'borderCulture', city),
  );
  // Summed with the meter's, then applied once — additive inside the channel,
  // exactly as Entry XVII has it inside a stage. Floored at zero for
  // `borderFactor`'s own reason: the worst a modifier can do is stop a border,
  // never march it backwards.
  const factor = frozen ? 0 : Math.max(0, borderFactor(effects) + cardPercent / 100);
  const base = yields.culture;
  const perTurn = Math.floor(base * factor);
  const cost = borderCostFor(state, city);
  return {
    base,
    percent: borderPercent(effects) + (frozen ? 0 : cardPercent),
    frozen,
    perTurn,
    banked: city.culture,
    cost,
    turns: turnsToFill(cost - city.culture, perTurn),
  };
}

/** One line of why a unit costs what it costs. Folds to `unitProductionCost`. */
export interface UnitCostLine {
  source: string;
  /** Hammers this line adds to the running figure. Signed. */
  amount: number;
}

/**
 * The age band a unit's price is multiplied by: the age of the technology that
 * unlocks it, or the first band for a type nothing gates.
 *
 * Read off the tree rather than stored on the unit row, because "when does this
 * belong" is already written down once — in `unlocks` — and a second copy on
 * the unit is a second copy to forget when a designer moves a node between ages.
 */
function unitCostFactor(type: UnitTypeId): { age: number; factor: number } {
  const ladder = RULES.production.unitCostAgeMultiplier;
  const gate = UNIT_UNLOCK_TECH.get(type);
  const age = gate === undefined ? 1 : techDef(gate).age;
  return { age, factor: ladder[age - 1] ?? ladder[0] ?? 1 };
}

/**
 * What one unit of this type costs *this player, right now*, as the ordered
 * list the price is the fold of (hard rule 5, said about a price rather than a
 * yield).
 *
 * Four lines, in the order they apply, because the order is the arithmetic:
 *
 *   1. **the roster's price** — `cost` off `data/units.json`.
 *   2. **the ladder** — `escalation` for every one of *this type* this empire
 *      has already built or bought, read off its own count in
 *      `Player.unitsBuilt` (schema 31: one ladder per escalating type, not one
 *      shared counter — a settler habit and a worker habit price separately).
 *      Presence of the field is the marker, here and in `realiseItem`: a
 *      designer who writes an escalation of zero has declared an escalating
 *      type whose ladder is currently flat, not a flat type.
 *   3. **the age band** — `unitCostAgeMultiplier`, on the sum of the two above.
 *      It multiplies the *escalated* figure rather than the printed one so that
 *      a late-age escalating unit climbs in the money of its own era; the
 *      settler itself is Age I and multiplies by one, so nothing about the
 *      opening moved. See `ProductionRules`.
 *   4. **the empire's law** — `settlerCost`, asked only of the **settler**: the
 *      rule names the settler by id and predates the ladder's generalisation, so
 *      it is not widened to any other escalating type — a card that cheapens
 *      settlers touches settlers and nothing else. It is the last of that pair:
 *      `noSettlerEscalation` was retired on 2026-09-03 once no card carried it,
 *      so the ladder in line 2 now always climbs.
 *
 * Every step floors, and the fold is exact by construction: each line carries
 * the *difference* it makes to the running figure, so the list sums to the
 * price no matter how the intermediate roundings fall.
 *
 * An unknown player is priced with no ladder and no law rather than refused:
 * this is a display and charging function, and the caller that could be handed
 * a stale id is the UI.
 */
export function explainUnitCost(
  state: GameState,
  playerId: number,
  type: UnitTypeId,
): UnitCostLine[] {
  const def = unitDef(type);
  const lines: UnitCostLine[] = [{ source: def.name, amount: def.cost }];
  let running = def.cost;

  const increment = def.escalation;
  if (increment !== undefined) {
    const player = playerById(state, playerId);
    // **The ladder always climbs** (the user's flag ruling of 2026-09-03,
    // retiring `noSettlerEscalation`). Manifest of the Steppe dropped the clause
    // in the balance pass, which left a rule id no card carried and a branch
    // here nothing could take; both are gone rather than kept warm for a card
    // that may never be written. A law that cheapens settlers still can —
    // `settlerCost` is the fourth line below — it simply cannot stop the count.
    const built = player?.unitsBuilt?.[type] ?? 0;
    if (built > 0) {
      lines.push({ source: `${built} already built`, amount: increment * built });
      running += increment * built;
    }
  }

  const { age, factor } = unitCostFactor(type);
  if (factor !== 1) {
    const scaled = Math.floor(running * factor);
    lines.push({
      source: `Age band · Æra ${eraNumeral(age)} ×${factor}`,
      amount: scaled - running,
    });
    running = scaled;
  }

  if (increment !== undefined && type === 'settler') {
    const percent = foldCardRulePercent(cardRulePercent(state, playerId, 'settlerCost'));
    if (percent !== 0) {
      // Floored at 1: a free settler would be an empire that settles every turn.
      const ruled = Math.max(1, Math.floor((running * (100 + percent)) / 100));
      lines.push({ source: `Cards ${percent > 0 ? '+' : ''}${percent}%`, amount: ruled - running });
      running = ruled;
    }
  }

  return lines;
}

/** The fold of `explainUnitCost`, and the only sum of one. */
export function foldUnitCost(lines: readonly UnitCostLine[]): number {
  let total = 0;
  for (const line of lines) total += line.amount;
  return total;
}

/**
 * What one unit of this type costs *this player, right now*.
 *
 * The one evaluator (Entry VIII). `advanceProduction` charges through it, the
 * city panel prices its buildable rows and its queue rows through it, the
 * banners and the panel estimate turns through it, and the tech screen quotes a
 * not-yet-unlocked unit through it — so the number on the button is the number
 * the city pays, and no second implementation can drift out from under the
 * first. It is the fold of `explainUnitCost` and nothing else, so the sentence
 * the panel prints and the hammers the basket is charged are one arithmetic.
 */
export function unitProductionCost(
  state: GameState,
  playerId: number,
  type: UnitTypeId,
): number {
  return foldUnitCost(explainUnitCost(state, playerId, type));
}

/**
 * Hammers the item at the front of a queue costs *this player*, or `null` if it
 * is unknown. Units are priced by `unitProductionCost`; buildings and projects
 * are flat.
 *
 * A project's cost is what one *turn of the conversion* costs — it is charged
 * again the moment it is paid, because a project never leaves the queue (see
 * `settleProduction`). That is why `turnsToBuild` needs no project clause: "how
 * long until this completes" and "how often does this pay" are the same
 * question for a repeatable item.
 *
 * Takes the owner rather than reading it off a city, because a queue item is
 * also priced before it belongs to one (the panel's buildable rows).
 */
export function queueItemCost(
  state: GameState,
  playerId: number,
  item: QueueItem,
): number | null {
  if (item.kind === 'unit') {
    return isUnitTypeId(item.id) ? unitProductionCost(state, playerId, item.id) : null;
  }
  if (item.kind === 'project') {
    return isProjectId(item.id) ? projectDef(item.id).cost : null;
  }
  return isBuildingId(item.id) ? buildingDef(item.id).cost : null;
}

/** The display name of a queue item, or its raw id if the id is unknown. */
export function queueItemName(item: QueueItem): string {
  if (item.kind === 'unit') return isUnitTypeId(item.id) ? unitDef(item.id).name : item.id;
  if (item.kind === 'project') return isProjectId(item.id) ? projectDef(item.id).name : item.id;
  return isBuildingId(item.id) ? buildingDef(item.id).name : item.id;
}

/**
 * Turns this city needs to finish `item` if it stood at `index` in the queue, or
 * `null` when it never would — the city makes no hammers, or the item is not a
 * thing this game knows how to price.
 *
 * The one evaluator every "…t" in the city screen reads (Entry VIII, and the
 * same discipline `unitProductionCost` keeps for the price itself): the progress
 * bar's estimate, each queue row's estimate, and the "if I added this" estimate
 * on a buildable button are three readings of one function, so they cannot round
 * differently or disagree about what the basket is paying for.
 *
 * `index` is what the basket turns on, and it is the whole of the arithmetic's
 * honesty. A city banks hammers toward whatever is *at the front* of its queue
 * (`advanceProduction` only ever looks at `queue[0]`), so only the front item
 * may count what is already banked; anything behind it is quoted at full price.
 * A row the player is about to *append* is therefore asked at `city.queue.length`
 * — which is 0 exactly when the queue is empty, and an empty city's basket is
 * indeed what the next thing queued will be paid for.
 *
 * Estimates are per-item, not cumulative: this is "how long does this take to
 * build", not "how long until the queue reaches it". A cumulative figure would
 * have to assume nothing ahead of it changes price, and a settler ahead of it in
 * an empire mid-expansion does exactly that (see `advanceProduction`).
 *
 * `quote` is the city's `cityQuote`, for a caller asking this of many rows at
 * once — the build list asks it of every unit, every building and every queue
 * row on a single town, and the empire underneath the answer is the same every
 * time. It changes no arithmetic: the rate is still `cityYields`' production
 * for *this* item, still folded by that one function, and the quote is only the
 * half of its ingredients the item cannot change. See `CityQuote` for the
 * lifetime that makes handing one in safe.
 */
export function turnsToBuild(
  state: GameState,
  city: City,
  item: QueueItem,
  index: number,
  quote?: CityQuote,
): number | null {
  const cost = queueItemCost(state, city.ownerId, item);
  if (cost === null) return null;
  const banked = index === 0 ? city.hammerBasket : 0;
  // The rate *for this item*: a barracks city fills its basket faster while a
  // unit is at the front and at the plain rate otherwise, so an estimate that
  // divided by the city's unmodified production would promise a schedule the
  // basket beats. See `cityYields`'s `toward`.
  return turnsToFill(cost - banked, cityYields(state, city, [], item, quote).production);
}

// --- turn phases ------------------------------------------------------------

/**
 * `collectYields`: re-assign every city's citizens, then bank what they made.
 *
 * Cities are walked in `state.cities` order — the order they were founded — and
 * so is every other phase. That is the documented design: each phase sweeps all
 * cities before the next phase begins, so no city can grow off yields a later
 * city has not collected yet, and the whole turn is one pass per rule rather
 * than one pass per city.
 *
 * The hammers are banked at the rate for whatever is at the **front** of the
 * queue, which is where a per-category modifier lands: a barracks pays its ten
 * percent into the basket on the turns the city is actually building a unit, and
 * nothing on the turns it is building a granary. That is the Civ reading, it is
 * the only one a single basket can express, and it is the rate `turnsToBuild`
 * quoted — one call to one evaluator, so the estimate and the bank agree by
 * construction rather than by inspection.
 */
export function collectYields(state: GameState, report?: TurnReport): void {
  // **Every city is priced before any city banks**, and that is a rule rather
  // than a tidy-up (the maintenance ruling, 2026-08-28). `cityYieldPercents` now
  // reads the treasury — a seat in arrears loses a quarter of its science and
  // culture — so a single interleaved loop would price the first town against a
  // treasury of −20 and the fourth against the +9 the first three had just paid
  // in. The debt penalty would then depend on founding order, and the panel,
  // which cannot know how far through the sweep it is, would be wrong about
  // every town but one. Two loops make the whole turn agree on one answer to
  // "was this empire in debt", which is the only honest reading of an empire
  // -wide fact.
  //
  // The order of both loops is `state.cities`, which is founding order, which is
  // what every other phase sweeps in; nothing in the first loop reads anything
  // the first loop writes.
  const priced: { city: City; yields: CityYields }[] = [];
  for (const city of state.cities) {
    assignCitizens(state, city);
    priced.push({ city, yields: cityYields(state, city, [], city.queue[0]) });
  }

  for (const { city, yields } of priced) {
    // Upkeep, the settler halt and the happiness stifle, all in one function so
    // that what the panel promised is what the basket receives.
    const surplus = growthSurplus(state, city, yields);
    city.foodBasket += surplus;
    // **Reported here, whether or not the basket runs dry** — a deficit is a
    // deficit, and a settler-halted queue shields nothing (`growthIsHalted`
    // only ever clamps a *positive* surplus, so a city already underwater
    // reports exactly the same loss with or without one at the front of its
    // queue). `growCities`, later in this resolution, corrects `shrank` and
    // `population` on this same entry if the deficit actually starves the
    // town — see `StarvationReport`.
    if (surplus < 0) {
      report?.starved.push({
        cityId: city.id,
        ownerId: city.ownerId,
        lost: -surplus,
        shrank: false,
        population: city.population,
        ejected: [],
      });
    }
    city.hammerBasket += yields.production;
    // Only the border basket answers to the writ — see `borderGrowth`. The
    // empire's culture pool below is banked at the full rate, because authority
    // owns land and has no opinion about civics.
    city.culture += borderGrowth(state, city, yields).perTurn;

    const player = playerById(state, city.ownerId);
    if (!player) continue;
    player.gold += yields.gold;
    player.sciencePool += yields.science;
    player.culturePool += yields.culture;
    // The faithful gather, and augurs are what they gather for — see
    // `Player.faithPool` and `explainPurchaseCost`.
    player.faithPool += yields.faith;
    // **What the caravans carried**, counted once a turn for the Richest Roads
    // reckoning (design ledger Entry VI). Counted *here* and nowhere else,
    // because this is the one place a route's yields are banked rather than
    // previewed: `cityRouteYields` is folded into `cityQuote` on every estimate
    // the panel draws, and a counter raised there would count a hover. Reset at
    // the age's turn-over — see `Player.routeYieldsThisAge`.
    for (const line of cityRouteYields(state, city)) {
      player.routeYieldsThisAge += line.food + line.production + line.gold;
    }
  }

  // The empire-scale half of the luxury vocabulary, banked **once per player**
  // after every city has collected — which is the whole difference between an
  // `empireYields` signature and a `cityYields` one. Walked in `state.players`
  // order, and the fold of the same list the top bar's totals quote, so a silk
  // road's two gold is one number wherever it is read.
  for (const player of state.players) {
    const empire = foldResourceYields(empireResourceYields(state, player.id));
    player.gold += empire.gold;
    player.sciencePool += empire.science;
    player.culturePool += empire.culture;
    player.faithPool += empire.faith;
  }

  // The empire-scale half of the treasury: the connection gold every town
  // joined to the capital by road pays, less what those roads cost to keep and
  // less what the army and the institutions cost to run (`explainEmpireGold`).
  // Banked once per player after every city has collected, which is the same
  // seam and the same argument the luxuries' loop above makes — a connection
  // belongs to no town, it belongs to the road between two, and a garrison
  // belongs to the empire that raised it.
  for (const player of state.players) {
    player.gold += empireGold(state, player.id);
  }

  // And the empire-scale half of Statecraft, last of the three, for a reason
  // that is the whole of `rateConversion`: a card that pays "per faith gained
  // per turn" has to be asked *after* everything that pays faith this turn has
  // paid it, or The Tithe would be converting last turn's rate. So the rates
  // this pass produced are handed in — the same figures the phase has just
  // banked, never a second sweep that could answer differently.
  //
  // Deliberately **not** compounding: a conversion reads the turn's *base*
  // rates, so two cards converting faith both read the same faith and neither
  // reads the other's output. A conversion that fed another conversion would be
  // an ordering question with no honest answer under simultaneous turns.
  for (const player of state.players) {
    const cards = foldCardYields(explainEmpireCardYields(state, player.id));
    player.gold += cards.gold;
    player.sciencePool += cards.science;
    player.culturePool += cards.culture;
    player.faithPool += cards.faith;
  }

  // And **last of all**, the creditors. Placed at the very end of the phase for
  // one reason: "is this empire deep enough in arrears to lose a piece" has to
  // be asked of the treasury this turn actually left it with, after every coin
  // it earned and every coin it owed. A sweep placed earlier would take a
  // warrior off an empire whose caravans were about to come home.
  collectArrears(state, report);
}

/**
 * One unit per empire per turn, taken by the creditors — the other half of "the
 * treasury may go negative" (the user's ruling, 2026-08-28).
 *
 * Below `rules.upkeep.disbandBelow` a seat loses the piece it is paying most for
 * (`disbandCandidate`, which owns the ordering and the exemptions). **One per
 * turn and never a loop**: disbanding banks no gold, it only lowers next turn's
 * bill, so "until the treasury recovers" would mean "until the army is gone".
 * An empire that keeps overspending keeps losing one a turn, which is a spiral a
 * player can see coming and can stop.
 *
 * It reports rather than announces, which is `arriveOnTile`'s discipline: by the
 * time anybody reads the list the pieces are off the board, and `removeUnit` has
 * already closed their owners' eyes. The sink is optional so that a caller with
 * nothing to tell — a test, a preview — passes nothing.
 *
 * The wild is skipped, in `disbandCandidate`, which is where every other
 * "the wild does not do that" refusal for this system lives.
 */
function collectArrears(state: GameState, report?: TurnReport): void {
  for (const player of state.players) {
    const taken = disbandCandidate(state, player.id);
    if (!taken) continue;
    removeUnit(state, taken.unitId);
    report?.disbanded.push({
      unitId: taken.unitId,
      ownerId: player.id,
      type: taken.type,
      upkeep: taken.gold,
    });
  }
}

/**
 * What one empire banked this turn, per voice — the input every `rateConversion`
 * reads (`statecraft.ts`).
 *
 * The fold of the same `cityYields` the phase above banked, asked once more
 * rather than threaded through: threading would mean `collectYields` carrying an
 * accumulator through two loops for the benefit of one card family, and this is
 * six additions per city. It is the *base* rate deliberately — before any
 * conversion pays anything — which is what stops two cards feeding each other.
 *
 * **Two readers now** (the master-list cut of 2026-08-31), and the second is
 * `empireRateReading` below: a windfall whose figure is quoted in *turns* (The
 * Lyceum's extra turn of culture) has to ask the same books a `rateConversion`
 * asks, or "a turn of culture" would mean two different numbers depending on
 * which surface said it.
 */
function empireRates(state: GameState, playerId: number): {
  faithPerTurn: number;
  culturePerTurn: number;
  goldPerTurn: number;
  capitalFaithPerTurn: number;
  followingFaithPerTurn: number;
} {
  const rates = {
    faithPerTurn: 0,
    culturePerTurn: 0,
    goldPerTurn: 0,
    capitalFaithPerTurn: 0,
    followingFaithPerTurn: 0,
  };
  // Theocracy's tithe reads **one town's** faith, and it is read off the same
  // sweep rather than by a second pass: the capital's yields are already in
  // hand on the turn the loop reaches it, so "what did the capital bank" costs
  // one comparison. It is deliberately the *city's* faith and not the empire's
  // share of it — a signature about the temple city is about the temple city.
  const capital = capitalCityOf(state, playerId);
  // The empire's half of every town's percentages, taken once (2026-08-29).
  // `cityQuote`'s default is `empirePercents(state, ownerId)` and every city in
  // this loop has the same owner, so the default was the same two meter sweeps
  // repeated once per town — for the phase that banks the turn *and* for the
  // top bar's headline, which reads this list on every accepted command. The
  // figure is unchanged by construction: `empirePercents` is a pure function of
  // `(state, playerId)` and this is the very call the default would have made.
  const percents = empirePercents(state, playerId);
  // Which faiths this empire is *paid by* — the holy cities it holds — hoisted
  // once for the loop below, `zocField`'s bargain at the scale of a sweep.
  const held = heldReligions(state, playerId).map((religion) => religion.id);
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const yields = cityYields(state, city, [], city.queue[0], cityQuote(state, city, [], percents));
    rates.faithPerTurn += yields.faith;
    rates.culturePerTurn += yields.culture;
    rates.goldPerTurn += yields.gold;
    if (capital && city.id === capital.id) rates.capitalFaithPerTurn += yields.faith;
    // Cuius Regio's congregation, off the same sweep for the capital's reason:
    // the town's yields are already in hand, so "what did my faithful towns
    // bank" costs one comparison. The banner is the town's own derived reading
    // (`cityReligion`) against the faiths this empire is *paid by*
    // (`heldReligions` — the holy city's), so a conquered shrine moves the
    // sentence with it and nothing here can disagree with what the town flies.
    const kept = cityReligion(city);
    if (kept !== null && held.includes(kept)) rates.followingFaithPerTurn += yields.faith;
  }
  const empire = foldResourceYields(empireResourceYields(state, playerId));
  rates.faithPerTurn += empire.faith;
  rates.culturePerTurn += empire.culture;
  rates.goldPerTurn += empire.gold;
  // The empire lines join the *base* rate for the reason every other line here
  // does: a card that pays "per gold gained per turn" has to read the gold this
  // turn actually produced, and a connected empire's roads — and since the
  // maintenance ruling its army and its institutions — are part of it. All four
  // lines, maintenance included: a conversion reads what the treasury *made*,
  // and an empire whose upkeep eats its connections made less.
  for (const line of explainEmpireGold(state, playerId)) rates.goldPerTurn += line.gold;
  return rates;
}

/**
 * What one empire is banking per turn **right now**, for a reader that has no
 * turn phase behind it — `statecraft.ts`'s `windfallPayout`, composing a grant
 * quoted in turns (The Lyceum).
 *
 * `empireRates` stays private, and this is deliberately the *whole* of what
 * leaves the module: one function, returning the same `RateReading` a
 * `rateConversion` is handed, so a card that says "a turn of culture" and a card
 * that says "per culture gained per turn" read one set of books. It is asked
 * lazily — only when a rider actually names a rate — because it prices every
 * town, and an occasion nobody wrote such a rider for must not pay for it.
 */
export function empireRateReading(state: GameState, playerId: number): RateReading {
  return empireRates(state, playerId);
}

/**
 * The empire-scale card lines `collectYields` banks this turn — `empireYields`,
 * the empire-scoped `countScaled` payouts, and every `rateConversion`, read off
 * this turn's own rates.
 *
 * Exported so the top bar's headline and the phase that actually banks the
 * gold/science/culture/faith read the **same list**: a hand-rolled empire sum
 * on the UI side that left this out would print a rate the resolution
 * disagrees with, which is exactly the Great Litany bug this function exists
 * to close. `empireRates` stays private — it is an input this function alone
 * needs, not a fact anything else asks for.
 */
export function explainEmpireCardYields(state: GameState, playerId: number): CardYieldLine[] {
  return cardEmpireYields(state, playerId, empireRates(state, playerId));
}

/**
 * Food a city keeps out of the basket it just spent on a citizen — cotton's
 * signature, and zero for every empire without it.
 *
 * A share of the *threshold*, not of the overflow: "cities keep 10% of food upon
 * growing" is a rebate on what growing cost, so a city that grew at exactly the
 * threshold still keeps something and a city that overshot keeps the overshoot
 * *as well*. Floored, because the basket is whole numbers all the way down.
 *
 * `rulePercent` reads the `growthCarryover` rule as the percentage **itself**
 * rather than as a multiplier on a base, which is the one place the shape's two
 * readings differ: there is no base rate to scale — an empire without cotton
 * keeps nothing — so the number in the table is the rate. Said here because the
 * other two rules (`happinessDemand`, `borderCost`) do scale a base.
 */
export function growthCarryover(state: GameState, city: City, threshold: number): number {
  const percent =
    foldRulePercent(resourceRulePercent(state, city.ownerId, 'growthCarryover')) +
    // **The town is handed in**, because a rate may now name which towns it
    // applies in (Common Table: a city that follows keeps a quarter of its
    // basket). `cardRulePercent` with a city in hand also folds that town's own
    // live rites, which the borders channel has done since Entry XXVIII — the
    // same argument, one bucket over.
    foldCardRulePercent(cardRulePercent(state, city.ownerId, 'growthCarryover', city));
  if (percent <= 0) return 0;
  return Math.floor((threshold * percent) / 100);
}

/**
 * What spending this city's basket would do, given a basket of `food`.
 *
 * `planProduction`'s sibling one bucket over (Entry XVIII.1's three shapes: plan ·
 * settle · windfall wrapper), and the pure half of "would this city grow". `food`
 * defaults to the real basket; a caller weighing a grant that has not landed yet
 * — a grain cache in a ruin, a camp's provisions — passes what the basket *would*
 * hold, which is what lets a choice card promise a growth before it is taken.
 *
 * `null` when the basket does not cover the threshold. Starvation is deliberately
 * **not** here: it is not a settlement, it is the absence of one, and a windfall
 * can never cause it. See `growCities`, which owns that half.
 */
export interface GrowthPlan {
  /** Food the basket must give up: the threshold, less any carryover rebate. */
  cost: number;
  /** What the city's population becomes. */
  population: number;
}

export function planGrowth(
  state: GameState,
  city: City,
  food: number = city.foodBasket,
): GrowthPlan | null {
  const threshold = growthThreshold(city.population);
  if (food < threshold) return null;
  return {
    cost: threshold - growthCarryover(state, city, threshold),
    population: city.population + 1,
  };
}

/** What a growth settlement did, for the caller that has to say so out loud. */
export interface GrowthCompletion {
  city: City;
  /** The population it grew to. */
  population: number;
}

/**
 * Grows this city by one if its basket covers the threshold. The one
 * growth-completion routine in the game.
 *
 * Extracted from `growCities` for `settleProduction`'s reason and on the day the
 * second bucket acquired a windfall to serve (Entry XVIII's seam, closed by Entry
 * XX): a grain cache pays food, and "the basket was full so the city grew" must
 * be one implementation or the phase and the boon will disagree about the
 * carryover rebate within a month.
 *
 * Overflow is "whatever the basket keeps", exactly as production's is: the cost
 * is subtracted and nothing is zeroed, so a windfall behaves like a very good
 * harvest. **At most one point per call**, which is the phase's own rule — a city
 * handed sixty food grows once and starts the next citizen with the rest.
 */
export function settleGrowth(state: GameState, city: City): GrowthCompletion | null {
  const plan = planGrowth(state, city);
  if (!plan) return null;
  city.foodBasket -= plan.cost;
  city.population = plan.population;
  payGrowthRider(state, city);
  return { city, population: plan.population };
}

/**
 * The riders a city growing pays out — Granary Levies' ten hammers, today.
 *
 * Inside `settleGrowth` rather than beside its two callers, which is Entry
 * XVIII.1's rule read for riders: one completion routine per bucket, used by the
 * phase and the windfall wrapper alike, so a city grown by a grain cache pays
 * the same rider as one grown by a good harvest.
 *
 * It pays into the town that grew rather than into "the nearest city", because
 * the occasion *is* a town: a levy raised on a new mouth is raised where the
 * mouth is.
 */
function payGrowthRider(state: GameState, city: City): void {
  const player = playerById(state, city.ownerId);
  if (!player) return;
  const payout = windfallPayout(state, player.id, 'growth');
  if (payout.grants.length === 0) return;
  payWindfallGrants(state, player, payout, { col: city.col, row: city.row });
}

/**
 * The mid-turn entry point: grow, then refresh what the open panel reads.
 *
 * `settleProductionWindfall`'s twin, and it owes the interface strictly more than
 * that one does: a city that has just gained a citizen has a citizen to *place*,
 * and a panel showing the old dots would be showing a town with fewer people
 * working than it has. Through the one helper every mid-turn mutation goes
 * through (`refreshCityDerived`, whose docblock is the register).
 *
 * Every future windfall that pays food calls **this**, never `settleGrowth`
 * directly.
 */
export function settleGrowthWindfall(
  state: GameState,
  city: City,
): GrowthCompletion | null {
  const done = settleGrowth(state, city);
  if (!done) return null;
  // A growth **rider** can pay hammers (Granary Levies' ten), and Entry XVIII
  // says a one-time grant settles its bucket the instant it lands — so the
  // production bucket is settled too, through its own windfall wrapper. A no-op
  // when the basket does not cover the front item, which is the usual case, and
  // it is what makes a mid-turn growth pay exactly what an end-of-turn one does
  // (the phase reaches `advanceProduction` on the very next step).
  settleProductionWindfall(state, city);
  refreshCityDerived(state, city);
  return done;
}

/**
 * Grants citizens **outright** — not bought from the basket (ledger Entry
 * XXVIII, the Rite of the Harvest).
 *
 * The tenth entry in the mid-turn register (`refreshCityDerived`), and the first
 * one that does not fill a bucket at all: every other windfall pays *into* a
 * basket and lets the bucket's own completion routine decide whether that
 * finishes anything. A rite hands the town a citizen. There is no threshold to
 * clear, no overflow to carry and no plan to make — so this cannot go through
 * `settleGrowthWindfall`, and pouring enough food into the basket to force a
 * growth would be a different rule wearing a hat (it would also gift the
 * carryover, and the size of the gift would depend on how hungry the town
 * happened to be).
 *
 * What it *does* share with growth is everything that follows a citizen:
 *
 *   · the **growth riders** fire, once per citizen, through `settleGrowth`'s own
 *     rider routine — Granary Levies pays for a mouth however the mouth arrived;
 *   · the **production windfall** is settled, because a rider can pay hammers;
 *   · the city is **re-seated**, because a town that just gained a citizen has a
 *     citizen to place and a panel showing the old dots is showing a town with
 *     fewer people working than it has.
 *
 * Returns the population reached.
 */
export function settlePopulationWindfall(
  state: GameState,
  city: City,
  points = 1,
): number {
  const grant = Math.max(0, Math.floor(points));
  if (grant === 0) return city.population;
  city.population += grant;
  for (let i = 0; i < grant; i++) payGrowthRider(state, city);
  settleProductionWindfall(state, city);
  refreshCityDerived(state, city);
  return city.population;
}

/**
 * A one-time grant of `grant` food would grow *this* city — or `null`.
 *
 * `productionSettledBy`'s sibling, and the reason a choice card does no
 * arithmetic of its own: "+20🌾 → Uruk · grows to 4!" asks `planGrowth` with the
 * basket the grant would leave, so the promise on the button is made by the
 * function that will keep it.
 */
export function growthSettledBy(
  state: GameState,
  city: City,
  grant: number,
): number | null {
  const plan = planGrowth(state, city, city.foodBasket + grant);
  return plan === null ? null : plan.population;
}

/**
 * `growCities`: spend a full basket on a population point, or starve.
 *
 * Growth keeps the overflow and starvation does not: a city that grows carries
 * its surplus toward the next point, while a city that starves has its debt
 * written off along with the citizen who paid it. A negative basket that
 * survived would charge the same debt again next turn.
 *
 * The growth half is `settleGrowth` and is deliberately no longer inlined here —
 * a windfall grows the same city by the same rules mid-turn (Entry XVIII). This
 * phase is the sweep plus the one rule a windfall can never trigger: a city that
 * did not grow may instead be starving, and that is the absence of a settlement
 * rather than a settlement of its own.
 */
/**
 * The world's religions by id, in founding order — the tie-break every follower
 * mutation takes (`convertCitizen`, `shrinkFollowers`).
 *
 * Built here rather than reached for inside `state.ts`, because those two
 * helpers are deliberately pure over one `City` and may not see the register.
 */
function religionOrder(state: GameState): number[] {
  return state.religions.map((religion) => religion.id);
}

export function growCities(state: GameState, report?: TurnReport): void {
  for (const city of state.cities) {
    if (settleGrowth(state, city) !== null) continue;
    if (city.foodBasket <= CITIES.starvationShrinksAt) {
      const before = city.population;
      city.population = Math.max(1, city.population - 1);
      city.foodBasket = 0;
      const shrank = city.population < before;
      // **A famine takes a believer too.** The congregations are counts of
      // citizens (`City.followers`), so a town that loses a mouth and kept every
      // count would end up with more followers than people — and `cityReligion`
      // reads a *majority of the population*, so it would fly a banner the town
      // no longer earns. Taken from the largest congregation, which is
      // `shrinkFollowers`' rule and the mirror of a conversion's.
      //
      // Growth needs no such line, and that is the design rather than an
      // omission: a citizen is **born unconverted**, so a town that grows simply
      // has one more person the tide has not reached — which is why a big city
      // is harder to convert than a small one.
      if (shrank) shrinkFollowers(city, religionOrder(state));
      // **A shrunk city may no longer be able to build the front of its own
      // queue** (the user's addendum of 2026-08-29): a settler queued at size
      // 2 is not a settler a size-1 city may finish. `ejectUnbuildableQueue`
      // sets those rows aside; see it for why the hammers need no rescue.
      const ejected = shrank ? ejectUnbuildableQueue(city) : [];
      // The other half of `StarvationReport`: `collectYields`, earlier in this
      // same resolution, already logged the deficit that got the town here —
      // this only corrects what the deficit turned into. A city whose basket
      // was already empty on a healthy surplus (impossible today, but the
      // entry is found-or-nothing on purpose) writes nothing, because
      // `collectYields` wrote no entry for it to correct.
      if (shrank) {
        const entry = report?.starved.find((s) => s.cityId === city.id);
        if (entry) {
          entry.shrank = true;
          entry.population = city.population;
          entry.ejected = ejected;
        }
      }
    }
  }
}

/**
 * Removes every queue row this shrunk city can no longer build — a unit whose
 * `minCityPop` (`unitData.ts`) the new, smaller population no longer meets —
 * and returns their display names in queue order.
 *
 * Asked of `minCityPop`, never of a type name: nothing in `src/sim/` compares
 * a unit type against `"settler"`, and this is no exception (CLAUDE.md's
 * `openedResource`/`purchase.ts` rule, one more reader). The hammers are
 * untouched — `city.hammerBasket` is the city's **one** basket (Entry VIII's
 * "explainable yields" discipline read one system over) and simply pays for
 * whatever now heads the queue, so "the production stays paid" needs no ledger
 * of its own; it is true because nothing here touches the basket at all. If
 * nothing else was queued behind the evicted row the queue is now empty, which
 * is exactly what makes the "choose production" End Turn blocker fire — the
 * intended reading of "treat the queue as empty".
 *
 * Walked **backward** so a mid-loop splice never shifts an index still to be
 * visited, then the collected names are reversed back into queue order —
 * deterministic, and independent of how many rows are removed.
 */
function ejectUnbuildableQueue(city: City): string[] {
  const ejected: string[] = [];
  for (let i = city.queue.length - 1; i >= 0; i--) {
    const item = city.queue[i];
    if (item.kind !== 'unit' || !isUnitTypeId(item.id)) continue;
    if (unitDef(item.id).minCityPop <= city.population) continue;
    ejected.push(queueItemName(item));
    city.queue.splice(i, 1);
  }
  return ejected.reverse();
}

/**
 * Where a unit built in this city can stand: the city tile if its category has
 * room, otherwise the first neighbour in `HEX_DIRECTIONS` order that is passable
 * and has room. `null` when the city is completely boxed in.
 *
 * Exported since M9's purchases: a bought piece stands where a built one would,
 * which is the whole of "same completion routine" applied to the one question a
 * price cannot answer. See `realiseItem`.
 */
export function spawnTileFor(state: GameState, city: City, type: UnitTypeId): Tile | null {
  const def = unitDef(type);
  const { category } = def;
  const centre = cityTile(state.map, city);
  /**
   * **A ship is launched from the city that built it** (the user's ruling,
   * 2026-08-29), and the fallback is the water rather than the land.
   *
   * The same two beats as everything else — the centre, then a neighbour — but
   * read through the *hull's* own passability instead of `isPassable`, which is
   * the question "is this dry ground" and is exactly wrong here. `moveProfile`
   * answers both halves at once and answers them the way the walk will: the
   * centre is enterable iff this town is coastal (it is in the mover's `ports`),
   * and a neighbour is enterable iff it is open water. So a landlocked city
   * cannot launch a hull *and does not need a clause saying so* — it simply has
   * nowhere to put one, and `buildError` refuses the queue row long before this
   * with a sentence a player can read.
   *
   * A probe rather than a real unit for the reason every spawn question is a
   * hypothetical: nothing has been created yet, so the profile is built from a
   * piece that stands where the town does and belongs to whoever owns it.
   */
  if (isNaval(def)) {
    const probe: Unit = {
      id: -1,
      ownerId: city.ownerId,
      type,
      col: centre.col,
      row: centre.row,
      hp: def.maxHp,
      movesLeft: def.movement,
      hasAttacked: false,
    };
    const mover = moveProfile(state, probe);
    if (
      tileMoveCost(centre, mover) !== null &&
      hasStackingRoom(state, centre.col, centre.row, category)
    ) {
      return centre;
    }
    for (const tile of neighborTiles(state.map, tileHex(centre))) {
      if (tileMoveCost(tile, mover) === null) continue;
      if (hasStackingRoom(state, tile.col, tile.row, category)) return tile;
    }
    return null;
  }
  if (hasStackingRoom(state, centre.col, centre.row, category)) return centre;
  for (const tile of neighborTiles(state.map, tileHex(centre))) {
    if (!isPassable(tile)) continue;
    if (hasStackingRoom(state, tile.col, tile.row, category)) return tile;
  }
  return null;
}

/**
 * What settling this city's queue would do, given a basket of `hammers`.
 *
 * The **whole** of "can the front of this queue complete", asked without
 * mutating anything, so that the end-of-turn phase, a windfall (Entry XVIII) and
 * the worker sheet's "this chop finishes it!" preview are three readings of one
 * function rather than three arithmetics that can disagree. `hammers` defaults
 * to the city's real basket; a caller weighing a grant that has not landed yet
 * passes what the basket *would* hold.
 *
 * The four holds are `advanceProduction`'s and are described there. `'drop'` is
 * the fifth answer and is not a completion: a building already standing is
 * shifted off the queue and nothing is paid for it.
 *
 * The spawn tile is part of the plan because "where would it stand" is one of
 * the holds — a boxed-in city cannot complete a unit — so the question is asked
 * once and the answer carried, rather than asked here and again in the mutation.
 * A *hypothetical* plan's tile is therefore only as good as the board at the
 * moment it was asked, which is why nothing but `settleProduction` acts on it.
 */
export type ProductionPlan =
  | { kind: 'unit'; item: QueueItem; index: number; id: UnitTypeId; cost: number; tile: Tile }
  | { kind: 'building'; item: QueueItem; index: number; id: BuildingId; cost: number }
  | { kind: 'project'; item: QueueItem; index: number; id: ProjectId; cost: number }
  | { kind: 'drop'; item: QueueItem; index: number };

/**
 * What the front of the queue would do — or, under The Standing Levy, what the
 * first *unit* in it would do when the front cannot be paid for.
 *
 * The card's clause is `unitJumpsQueue` (`actionRule`), and it is read **here**
 * rather than in the phase so that a windfall gets it too: a chop that covers a
 * spearman two places down the queue finishes the spearman, exactly as an
 * end-of-turn basket would. The plan carries the queue `index` it names, which
 * is the whole of what the jump costs the rest of the file — `settleProduction`
 * splices at that index instead of shifting, and the index is 0 in every game
 * where nobody holds the card.
 *
 * The jump is deliberately narrow: it is asked **only when the front item does
 * not complete**, so a card that lets units cut in front cannot slow a queue
 * down, and it never reorders anything — the building the unit passed is still
 * next.
 */
export function planProduction(
  state: GameState,
  city: City,
  hammers: number = city.hammerBasket,
): ProductionPlan | null {
  const front = planQueueItem(state, city, hammers, 0);
  if (front) return front;
  if (!cardActionRule(state, city.ownerId, 'unitJumpsQueue')) return null;
  for (let index = 1; index < city.queue.length; index++) {
    if (city.queue[index]?.kind !== 'unit') continue;
    const jumped = planQueueItem(state, city, hammers, index);
    // A `drop` is not a completion and must not be reached by a jump: dropping
    // an item the player cannot see being considered would be the card quietly
    // editing the queue.
    if (jumped && jumped.kind === 'unit') return jumped;
  }
  return null;
}

/** One queue position, planned. The whole of what `planProduction` used to be. */
function planQueueItem(
  state: GameState,
  city: City,
  hammers: number,
  index: number,
): ProductionPlan | null {
  const item = city.queue[index];
  if (!item) return null;

  if (item.kind === 'unit') {
    if (!isUnitTypeId(item.id)) return null;
    const id: UnitTypeId = item.id;
    const def = unitDef(id);
    if (city.population < def.minCityPop) return null;
    if (def.requiresResource !== undefined && !hasResource(state, city.ownerId, def.requiresResource)) {
      return null;
    }
    const cost = unitProductionCost(state, city.ownerId, id);
    if (hammers < cost) return null;
    const tile = spawnTileFor(state, city, id);
    if (!tile) return null;
    return { kind: 'unit', item, index, id, cost, tile };
  }

  // A project is the plainest of the three: hammers, and nothing else. No
  // population floor, no strategic resource, no spawn tile and no `drop` —
  // there is no state a project can be in that makes it illegal, which is the
  // whole of what "the queue is never idle" means (Entry XXVI).
  if (item.kind === 'project') {
    if (!isProjectId(item.id)) return null;
    const id: ProjectId = item.id;
    const cost = projectDef(id).cost;
    if (hammers < cost) return null;
    return { kind: 'project', item, index, id, cost };
  }

  if (!isBuildingId(item.id)) return null;
  const id: BuildingId = item.id;
  // Only reachable from a hand-edited save or a queue built before the
  // building finished some other way; drop it rather than blocking the queue.
  if (city.buildings.includes(id)) return { kind: 'drop', item, index };
  // A wonder somebody else already finished. Unreachable in an ordinary game —
  // `claimWonder`'s own sweep (`refundBeatenWonders`) takes the row out of every
  // other queue in the world the instant it is claimed, and `buildError` refuses
  // it at the gate — so this is the hand-edited-save arm, and it is a *drop*
  // rather than a hold for the reason the line above is: a row that can never
  // complete must not be allowed to block the queue behind it forever. Nothing
  // is refunded here, because the refund belongs to the sweep that knew the
  // hammers were still toward it.
  if (isWonder(id) && wonderClaim(state, id) !== undefined) {
    return { kind: 'drop', item, index };
  }
  const cost = buildingDef(id).cost;
  if (hammers < cost) return null;
  return { kind: 'building', item, index, id, cost };
}

/**
 * What a settlement did, for the caller that has to say so out loud.
 *
 * A project reports here like anything else — "Uruk · Tithes" is a thing that
 * happened and the announcement line is entitled to say so — with the one
 * difference that `item` is still standing in `city.queue` when the caller
 * reads this. Nothing downstream cares: every consumer prints the name and the
 * cost, and none of them goes looking for the row.
 */
export interface ProductionCompletion {
  city: City;
  item: QueueItem;
  /** The display name of what completed — "Granary", "Settler". */
  name: string;
  /** Hammers taken out of the basket. What is left is the overflow. */
  cost: number;
  /** The unit that was spawned, when the item was a unit. */
  unitId?: number;
  /**
   * The wonder that was claimed, when the item was one — the news every seat
   * gets, and the losers' refunds with it. Absent for anything else, which is
   * every completion in most games.
   */
  wonder?: WonderCompletion;
  /**
   * What the finished thing **handed over** — `RealisedItem.grants`, carried
   * straight through. Absent when nothing was granted, which is almost always.
   */
  grants?: CompletionGrantReport[];
  /**
   * The patron a finished cathedral was dedicated to (Entry LV), carried
   * straight through from `RealisedItem`. Absent for everything that does not
   * consecrate, which is every completion but one.
   */
  consecration?: ConsecrationReport;
}

/**
 * A cathedral topped out, and the saint the roll gave it.
 *
 * A **report** and never a rule — `City.consecration` is already written by the
 * time anybody reads this (`ArrivalReport`'s discipline) — and it exists for
 * `WonderCompletion`'s reason exactly: the dedication is a *difference* that
 * stops existing the instant the command returns. A diff of two boards would
 * show a town that has a cathedral and a patron, with nothing to say that either
 * arrived this turn.
 *
 * News to its owner alone, unlike a wonder: a cathedral is one per town rather
 * than one per world, and whose saint it is is nobody else's business.
 */
export interface ConsecrationReport {
  cityId: number;
  /** The town's name, resolved once so no surface has to look the city up. */
  cityName: string;
  playerId: number;
  /** The row that consecrated — the cathedral today, whatever declares it later. */
  building: BuildingId;
  consecration: ConsecrationId;
  /** The patron's display name — "The Choir Loft". */
  name: string;
}

/**
 * A wonder finished, and what finishing it did to everybody else.
 *
 * The report `realiseItem` hands back, carried out through
 * `ProductionCompletion` → `TurnReport.wonders` → `CommandResult.wonders` to the
 * one line the interface prints. It is a report and not a rule: the claim is
 * already in `state.wonders` and the gold is already in the losers' treasuries
 * by the time anybody reads this — the same discipline `ArrivalReport` keeps.
 *
 * `{ cityId, playerId, building }` is the shape a future **`triumphs`** evaluator
 * reads to pay renown on a wonder (`docs/great-people.md`). That is the seam,
 * and it is deliberately the *report* rather than a hook inside the completion
 * routine: great people join by reading what already comes out, so nothing about
 * a wonder completing has to learn what a great person is.
 */
export interface WonderCompletion {
  building: BuildingId;
  /** The display name, resolved once so no surface has to look the row up. */
  name: string;
  cityId: number;
  playerId: number;
  /** `state.turn` it was finished on. */
  turn: number;
  /** Every city that was beaten to it. See `refundBeatenWonders`. */
  refunds: WonderRefund[];
}

/** One city beaten to a wonder, and what it got back. See `refundBeatenWonders`. */
export interface WonderRefund {
  building: BuildingId;
  cityId: number;
  playerId: number;
  /** Hammers that were in the basket toward it — zero unless it was the front row. */
  hammers: number;
  /** Gold paid for them, at `production.wonderRefundGoldPerHammer`. */
  gold: number;
}

/**
 * Completes **at most one** item at the front of this city's queue, if the
 * basket covers it. The one production-completion routine in the game.
 *
 * Extracted from `advanceProduction` (Entry XVIII.1) so that the end-of-turn
 * phase and a mid-turn windfall are the same code: spawn tile, escalation
 * ladder, overflow and the queue pop all happen here, once, or the two paths
 * drift the first time one of them is touched. The phase is now a sweep of this
 * over `state.cities`; a chop that covers the front item calls it for one city.
 *
 * Overflow is "whatever the basket keeps": the cost is subtracted, nothing is
 * zeroed, and the remainder pays for the next item. A windfall therefore behaves
 * exactly like a very good turn's work.
 *
 * The seam for the other buckets
 * ------------------------------
 * Entry XVIII says every one-time grant settles its bucket the moment it lands,
 * and production is only the first bucket. The shape to copy for the next one
 * (a flat science boon finishing the researched tech) is: a pure `plan…` that
 * answers "would this complete, and at what price", a `settle…` that performs it
 * and hands back what happened, and a `settle…Windfall` that adds whatever
 * derived state a mid-turn mutation owes the interface. `advanceResearch` gets
 * `settleResearch` / `settleResearchWindfall` on the day that boon exists — it
 * is deliberately not built today, because a settlement routine with no windfall
 * to serve is a guess about what the windfall will need.
 */
/**
 * Banks one completion of a project into its owner's pools.
 *
 * The whole of what a project *does*, in one function, so that the three banks
 * it may pay into are read as a table rather than as three branches somebody
 * has to remember to grow. `pays` is the printed figure and nothing multiplies
 * it — see `projectData.ts` for why that is arithmetic rather than taste.
 *
 * Nothing here settles a bucket, and that is the reason culture is not in
 * `ProjectPayout`: gold, science and faith are pools that accumulate and are
 * read where they lie, while a culture pool that fills is a draft owed
 * (`settleCultureWindfall`). A project that paid culture would be the second
 * path into that bucket the register in CLAUDE.md exists to forbid.
 *
 * **The riders are flat additions to the payout** — the Water Clock of Su
 * Song's three extra beakers on Scholarship — and they are added here, in the
 * one place a conversion is banked, so the panel's quoted rate and the pool's
 * gain are one figure. They do **not** reopen Entry XXVI's argument: nothing
 * multiplies the hammers going in, so no conversion is staged twice; the printed
 * rate simply got bigger for an empire that raised the clock.
 */
function payProject(state: GameState, playerId: number, id: ProjectId): void {
  const player = playerById(state, playerId);
  if (!player) return;
  const { pays } = projectDef(id);
  const extra = cardProjectPays(state, playerId, id);
  const gold = (pays.gold ?? 0) + (extra.gold ?? 0);
  const science = (pays.science ?? 0) + (extra.science ?? 0);
  player.gold += gold;
  player.sciencePool += science;
  player.faithPool += (pays.faith ?? 0) + (extra.faith ?? 0);
  // The Bead Race's two cumulative counters (The Tithe, The Scholarship). They
  // count what the *conversion* paid, riders included, because that is what the
  // card asks — "gather a great sum of gold from tithes" is about the tithes and
  // not about the treasury, which a war can empty. On the player rather than
  // derived, for `citiesFounded`' reason: a pool is a bank that moves both ways
  // and a total spent is not a thing the board remembers.
  if (id === 'tithes') player.tithesGold += gold;
  if (id === 'scholarship') player.scholarshipScience += science;
}

export function settleProduction(state: GameState, city: City): ProductionCompletion | null {
  const plan = planProduction(state, city);
  if (!plan) return null;

  if (plan.kind === 'drop') {
    city.queue.splice(plan.index, 1);
    return null;
  }

  // A project is the one completion that leaves the queue as it found it, and
  // that is the whole mechanism of a repeatable item: the hammers come out, the
  // conversion is banked, and the row is still standing there tomorrow morning
  // asking for twenty more. It returns before three things that are about
  // *finishing something*, each deliberately:
  //
  //   · the **splice** — nothing finished, so nothing leaves.
  //   · the **overflow doubling** (The Common Purse) — a card about the
  //     remainder left over from a completed thing. A repeatable item's
  //     remainder is not overflow, it is next turn's down payment, and doubling
  //     it every turn would be a mint rather than a bonus.
  //   · the **completion riders** — Master Masons' culture on a wall, Rites of
  //     Passage' faith on a sword. Both are paid for building a *thing*; a
  //     conversion that triggered them would pay a card's one-off every fourth
  //     turn for the rest of the game.
  //
  // What it does do is bank the printed figure, unstaged. See `projectData.ts`:
  // the hammers were already multiplied on their way into the basket, so a
  // payout that rode the modifier pipeline would charge one conversion twice.
  if (plan.kind === 'project') {
    city.hammerBasket -= plan.cost;
    // **A race project finishes**, and that is the whole of what separates an
    // endeavour from Tithes (design ledger Entry VI). It leaves the queue like a
    // building and claims its bead through `beads.ts` — which refuses a row the
    // world has already given away, so a later finisher's hammers are simply
    // spent and nothing here needs a clause about second place.
    //
    // It falls through to the *building* half deliberately: the splice, the
    // overflow and The Common Purse's doubling are all about a thing that
    // finished, and this one did.
    if (projectFinishes(plan.id)) {
      city.queue.splice(plan.index, 1);
      const done: ProductionCompletion = {
        city,
        item: plan.item,
        name: queueItemName(plan.item),
        cost: plan.cost,
      };
      if (city.hammerBasket > 0 && cardActionRule(state, city.ownerId, 'doubleOverflow')) {
        city.hammerBasket += city.hammerBasket;
      }
      if (isBeadEndeavourId(plan.id)) claimEndeavour(state, city, plan.id);
      return done;
    }
    payProject(state, city.ownerId, plan.id);
    return { city, item: plan.item, name: queueItemName(plan.item), cost: plan.cost };
  }

  city.hammerBasket -= plan.cost;
  // Spliced at the plan's own index rather than shifted, which is `planProduction`'s
  // side of The Standing Levy: 0 in every game where nobody holds that card, so
  // this is the shift it used to be.
  city.queue.splice(plan.index, 1);
  const done: ProductionCompletion = {
    city,
    item: plan.item,
    name: queueItemName(plan.item),
    cost: plan.cost,
  };

  // Overflow, doubled where a card says so (The Common Purse). Done *here*, in
  // the one completion routine, so a windfall-completed item overflows by the
  // same rule an end-of-turn one does. What is left in the basket after the cost
  // is subtracted is the overflow, so doubling it is one addition of itself.
  if (city.hammerBasket > 0 && cardActionRule(state, city.ownerId, 'doubleOverflow')) {
    city.hammerBasket += city.hammerBasket;
  }

  if (plan.kind === 'building') {
    const realised = realiseItem(state, city, { kind: 'building', id: plan.id });
    if (realised.wonder) done.wonder = realised.wonder;
    if (realised.grants) done.grants = realised.grants;
    if (realised.consecration) done.consecration = realised.consecration;
    return done;
  }
  done.unitId = realiseItem(state, city, {
    kind: 'unit',
    id: plan.id,
    tile: plan.tile,
  }).unitId;
  return done;
}

/**
 * A thing this city is about to have, once somebody has paid for it. The
 * argument to `realiseItem`, and deliberately **not** a `QueueItem`: a project
 * is not on it, because a project is a conversion that never becomes anything,
 * and the spawn tile rides along on a unit because "where would it stand" is
 * settled before the payment, never after it.
 */
export type CompletedItem =
  | { kind: 'unit'; id: UnitTypeId; tile: Tile }
  | { kind: 'building'; id: BuildingId };

/**
 * What realising a thing produced, for the caller that has to pass it on.
 *
 * Two optional fields and both are usually absent: a building answers `{}`, a
 * unit answers its new id, and a **wonder** answers the completion every seat is
 * told about. It became a shape rather than staying `number | undefined` on the
 * day the second kind of news existed — a second out-parameter would have been a
 * second place to forget one.
 */
/**
 * How a thing came to be realised, for the one fact about it that the thing
 * itself cannot say.
 *
 * One flag today. It exists because `realiseItem` is deliberately *the* seam for
 * "the city now has the thing" and serves three occasions that differ in nothing
 * a caller could inspect afterwards — a completion, a purchase, and a gift — yet
 * the third one puts a piece on the board that its empire never paid for. A
 * struct rather than a bare boolean so a second such fact joins the shape
 * instead of becoming a fifth positional argument (`RealisedItem`'s own
 * discipline, read from the other end).
 */
export interface RealiseOptions {
  /**
   * The empire is not paying for this. Sets `Unit.freeUpkeep`; ignored for a
   * building, which has no such mark — a granted building's maintenance follows
   * the stones exactly as a wonder's renown does.
   */
  free?: boolean;
}

export interface RealisedItem {
  /** The unit that came into the world, when the item was a unit. */
  unitId?: number;
  /** The wonder that was claimed, when the building was one. */
  wonder?: WonderCompletion;
  /**
   * What the building **handed over** on completion, in the order the row lists
   * it — a free settler-of-war, a technology finished outright, a Doctrine draft
   * opened. Absent for everything that grants nothing, which is every completion
   * in most games.
   *
   * The third kind of news, joining the shape rather than becoming a second
   * out-parameter (which is what this interface exists to prevent). It is a
   * **report**: by the time anybody reads it the unit is on the board, the
   * research is banked and the offer is on the seat.
   */
  grants?: CompletionGrantReport[];
  /**
   * The patron a finished cathedral was dedicated to, when the building carried
   * `BuildingDef.consecrated`. Absent for everything else, which is every
   * completion but one.
   *
   * The fourth kind of news, joining the shape rather than becoming a second
   * out-parameter — which is what this interface exists to prevent. It is a
   * **report**: by the time anybody reads it the dedication is on the town and
   * the patron is already paying.
   */
  consecration?: ConsecrationReport;
}

/**
 * One thing a completion handed over, said in the words a toast would use.
 *
 * A *report* and never a rule — everything it describes has already happened
 * (`ArrivalReport`'s discipline). `done: false` is a grant the state could not
 * take: a seat with no research chosen when the Great Library lands loses the
 * technology, and the interface has to be able to say so rather than leaving a
 * player wondering what a wonder did.
 */
export interface CompletionGrantReport {
  grant: CompletionGrant['grant'];
  /** What arrived, named: "Swordsman", "Mathematics", "a Doctrine draft". */
  name: string;
  /** False when nothing could be granted. See the docblock. */
  done: boolean;
  /** The unit that arrived, for a `unit` grant that landed. */
  unitId?: number;
}

/**
 * **The one place a city gains a thing.** The half of a completion that is about
 * the *thing* rather than about the queue, split out (M9) so that the two ways
 * to acquire one — hammers and coin — are one implementation.
 *
 * What is here is everything that follows from a unit or a building *existing*:
 * the piece comes into the world through `createUnit` (full movement, unspent
 * attack, its charges, its owner's fog refreshed — so it can act on the turn it
 * arrived, Entry XVIII.2's reading), the escalation ladder climbs so the next
 * settler anywhere in the empire is dearer, the building joins the town, and
 * either way the completion riders are paid.
 *
 * What is deliberately *not* here is everything about the **basket**: the cost
 * subtraction, the overflow (and The Common Purse's doubling of it) and the
 * queue splice all belong to `settleProduction`, because a purchase touches none
 * of them — a bought granary does not spend the hammers a city had banked toward
 * a spearman. That line is the whole reason the split lands where it does.
 *
 * Answers the new unit's id, or `undefined` for a building.
 */
export function realiseItem(
  state: GameState,
  city: City,
  item: CompletedItem,
  options: RealiseOptions = {},
): RealisedItem {
  if (item.kind === 'building') {
    city.buildings.push(item.id);
    // The claim, and the race it settles. Here rather than in `settleProduction`
    // because this is the routine that means "the city now has the thing", and
    // a wonder existing *is* the claim — a second path that put a building in a
    // town without claiming would be a second Oracle.
    const wonder = isWonder(item.id) ? claimWonderFor(state, city, item.id) : undefined;
    if (wonder) payWonderRenown(state, city, item.id);
    // The row's own completion grants, **after** the claim and the renown and
    // before the riders: a wonder hands over what it hands over because it now
    // stands, and a technology it finishes has to land before a rider that might
    // pay on `tech` is asked. See `CompletionGrant`.
    // **The dedication** (Entry LV), between the claim and the grants: the
    // stones stand, so the saint over the door is settled before anything the
    // row hands over is asked for. Asked of the row's own **marker**, so nothing
    // here compares a building id against `"cathedral"`.
    const consecration = consecrateBuilding(state, city, item.id);
    const grants = payCompletionGrants(state, city, item.id);
    payCompletionRiders(state, city, 'building');
    // **The finish line**, last and after the grants (design ledger Entry
    // LVIII). The order is the rule: the row's golden bead is one of those
    // grants, so a close that ran first would settle the race on a tally one
    // bead short of the truth. Asked of the row's own marker
    // (`BuildingDef.endsTheGame`), so nothing here names the Opus — and here, in
    // the one routine that means "the city now has the thing", so an Opus
    // hammered out, hurried by contributions or bought outright all close the
    // age by this line. The reckonings it takes ride out on the ordinary bead
    // diff and `state.winnerId` carries the rest, which is why it needs no field
    // on `RealisedItem`.
    if (buildingDef(item.id).endsTheGame === true) closeTheGreatWork(state, city);
    const realised: RealisedItem = {};
    if (wonder) realised.wonder = wonder;
    if (consecration) realised.consecration = consecration;
    if (grants.length > 0) realised.grants = grants;
    return realised;
  }
  const unit = createUnit(state, city.ownerId, item.id, item.tile.col, item.tile.row);
  // The maintenance mark, and the *only* thing `options` is for. A gift is a
  // gift: a Levy's spearman and Camp Followers' stray cost their empire nothing
  // to keep, while a piece the queue paid for or the treasury bought goes on the
  // payroll like every other. That distinction cannot be derived from anything
  // this routine can see — the piece, the town and the roster are identical
  // either way — which is exactly why it is a parameter and not a rule. See
  // `Unit.freeUpkeep` for the register of who passes it.
  if (options.free) unit.freeUpkeep = true;
  // The ladder climbs at completion, so the next one of this *same type* —
  // anywhere in the empire — is dearer from the very next resolution. Its own
  // key in `Player.unitsBuilt`, not a shared counter (schema 31). A free grant
  // does not climb it: `options.free` already marks this unit as never having
  // been paid for, and a habit nobody paid into is not a habit.
  if (unitDef(item.id).escalation !== undefined && !options.free) {
    const player = playerById(state, city.ownerId);
    if (player) player.unitsBuilt[item.id] = (player.unitsBuilt[item.id] ?? 0) + 1;
  }
  payCompletionRiders(state, city, 'unit');
  return { unitId: unit.id };
}

/**
 * The strongest melee type this empire can build **right now**, or `null`.
 *
 * The Statue of Zeus' "a free melee unit of your best type", read off the roster
 * rather than named on the row — so the wonder keeps meaning what it says
 * through every retune of the tree, and a data row never has to be edited
 * because a longswordsman arrived. Melee is `modelClass`, which is the roster's
 * own word for the line that closes; ties go to roster order, which is the
 * table's own order and therefore a fact a replay reproduces.
 *
 * "Can build" is `buildError`'s question, asked whole rather than re-derived, so
 * the free sword obeys the technology gate and the improved-iron gate exactly as
 * a built one does. A seat that can build nothing gets nothing, and the report
 * says so.
 */
/**
 * How many beakers this empire is still short of the node it is researching, or
 * `null` when it is aiming at nothing at all.
 *
 * The pure half of the Great Library's grant. It reads the aim and the table
 * and nothing else, so the *completion* is still `settleResearch`'s — the grant
 * covers the shortfall and the one research-completion routine spends it, which
 * is how a wonder's technology earns the era check, the upgrade sweep and the
 * Lyceum's culture exactly as a turn's beakers would.
 */
function pendingResearchCost(player: Player): { missing: number } | null {
  const id = player.researching;
  if (id === null || !isTechId(id)) return null;
  return { missing: Math.max(0, techDef(id).cost - player.sciencePool) };
}

/**
 * The strongest melee row this empire could build right now, or `null`.
 *
 * `CompletionGrant`'s `'bestMelee'` and `CardPeriodicMusterEffect`'s are the
 * same word answered here, once: a wonder's gift and an Order's levy must not
 * disagree about which spear an era is owed. Asked through `buildError`, so the
 * technologies, the resources and the empire's own law all count.
 */
export function bestMeleeFor(state: GameState, playerId: number): UnitTypeId | null {
  let best: UnitTypeId | null = null;
  let strength = -1;
  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    if (def.modelClass !== 'melee') continue;
    if (buildError(state, playerId, 'unit', id) !== null) continue;
    if (def.combatStrength <= strength) continue;
    strength = def.combatStrength;
    best = id;
  }
  return best;
}

/**
 * Dedicates a finished building to a patron, if its row says one is dedicated —
 * **the one place `City.consecration` is written** (design ledger Entry LV).
 *
 * One draw off `state.rng`, uniform over `CONSECRATION_IDS` in file order. It is
 * logged-deterministic *by construction* rather than by a rule anybody has to
 * keep: the roll sits inside `realiseItem`, which every way of acquiring a
 * building goes through, so a replay of `{config, log}` reaches this line at the
 * same point in the same order with the generator in the same state — and a
 * cathedral hurried by contributions, bought outright or finished by the queue
 * all draw from the same stream.
 *
 * The **marker** is the row's (`BuildingDef.consecrated`), so a second building
 * that wants a pack-opening completion is a JSON flag and this function never
 * learns its name. A town that somehow already carries a dedication keeps it:
 * the field is presence-is-the-state and there is exactly one occasion that
 * writes it, so a second write would mean a second cathedral in one town, which
 * `buildError` refuses.
 */
function consecrateBuilding(
  state: GameState,
  city: City,
  building: BuildingId,
): ConsecrationReport | undefined {
  if (buildingDef(building).consecrated !== true) return undefined;
  if (city.consecration !== undefined) return undefined;
  if (CONSECRATION_IDS.length === 0) return undefined;
  const id = CONSECRATION_IDS[nextInt(state.rng, 0, CONSECRATION_IDS.length)]!;
  city.consecration = id;
  return {
    cityId: city.id,
    cityName: city.name,
    playerId: city.ownerId,
    building,
    consecration: id,
    name: consecrationDef(id).name,
  };
}

/**
 * Hands over what a finished building grants, once. See `CompletionGrant`.
 *
 * Every arm goes through the seam that already owns its bucket, and none of them
 * grows a second one:
 *
 *   · a **unit** through `createUnit` + `spawnTileFor`, the same pair
 *     `realiseItem` uses for a built one, so the spawn convention has one
 *     implementation and the piece can act on the turn it arrived. A town with
 *     nowhere to put it gets nothing rather than a piece standing in the sea.
 *   · a **technology** through `settleResearchWindfall`, by covering whatever is
 *     left of the current research — so the register's refresh fires and every
 *     city of the empire is re-seated on ground the node just made worth more.
 *     A seat with nothing chosen loses it, and the report says so: an
 *     offer-shaped alternative would be a second research interface, and holding
 *     the grant until a choice was made would be state nobody sweeps.
 *   · a **Doctrine draft** through `drawDoctrineOffer` at the seat's own
 *     government tier, **skipped** when there is no live pool (the chiefdom's
 *     tier deals nothing) or the seat is already holding an unanswered one —
 *     `periodicOffer`'s precedent exactly, because an offer is a decision the
 *     player owes the game and a second one dealt on top would destroy the
 *     first.
 */
function payCompletionGrants(
  state: GameState,
  city: City,
  building: BuildingId,
): CompletionGrantReport[] {
  const grants = buildingDef(building).onComplete;
  if (!grants || grants.length === 0) return [];
  const player = playerById(state, city.ownerId);
  if (!player) return [];
  const reports: CompletionGrantReport[] = [];

  for (const grant of grants) {
    if (grant.grant === 'unit') {
      const type = grant.unit === 'bestMelee' ? bestMeleeFor(state, player.id) : grant.unit;
      if (type === null) {
        reports.push({ grant: 'unit', name: 'a unit', done: false });
        continue;
      }
      const tile = spawnTileFor(state, city, type);
      if (!tile) {
        reports.push({ grant: 'unit', name: unitDef(type).name, done: false });
        continue;
      }
      const born = createUnit(state, player.id, type, tile.col, tile.row);
      // A wonder's gift, so nobody paid for it — the Statue of Zeus' swordsman
      // and Hagia Sophia's are the two today. See `Unit.freeUpkeep`, entry 3.
      born.freeUpkeep = true;
      reports.push({ grant: 'unit', name: unitDef(type).name, done: true, unitId: born.id });
      continue;
    }
    if (grant.grant === 'tech') {
      const plan = pendingResearchCost(player);
      if (plan === null) {
        reports.push({ grant: 'tech', name: 'a technology', done: false });
        continue;
      }
      // The pool is topped up to exactly what the node costs and the ordinary
      // completion routine spends it, so the overflow, the era check, the
      // upgrade sweep and the Lyceum's rider all happen once and in one place.
      if (plan.missing > 0) player.sciencePool += plan.missing;
      const done = settleResearchWindfall(state, player);
      reports.push({
        grant: 'tech',
        name: done?.name ?? 'a technology',
        done: done !== null,
      });
      continue;
    }
    if (grant.grant === 'building') {
      // Through `realiseItem` itself — the one seam that means "this town now
      // has the thing" — so a granted building claims its wonder, rolls its
      // consecration and pays its riders exactly as a built one does. A town
      // that already holds the row gets nothing, which is also what keeps a row
      // that granted itself from recurring: `realiseItem` pushes the id before
      // it asks for the grants.
      const already = city.buildings.includes(grant.building);
      if (already) {
        reports.push({
          grant: 'building',
          name: buildingDef(grant.building).name,
          done: false,
        });
        continue;
      }
      realiseItem(state, city, { kind: 'building', id: grant.building });
      reports.push({ grant: 'building', name: buildingDef(grant.building).name, done: true });
      continue;
    }
    if (grant.grant === 'bead') {
      // **Through `awardBeadGrant`**, the beads system's own seam — so the bead
      // is recorded, announced and diffed by exactly the machinery every other
      // bead in the game goes through, and this routine learns nothing about
      // rods or thresholds. A realm that already holds the row is refused there
      // (a grant is once per empire) and answers `null`, which is a `done:
      // false` here rather than a second bead.
      const award = awardBeadGrant(state, player.id, grant.bead);
      reports.push({
        grant: 'bead',
        name: award?.name ?? anyBeadDef(grant.bead).def.name,
        done: award !== null,
      });
      continue;
    }
    if (grant.grant === 'greatPerson') {
      // `doctrineDraft`'s arm one roster over, word for word: an offer is a
      // decision the seat owes the game, so one already waiting is kept and this
      // grant simply does not land. `family` narrows the draw and is otherwise
      // the ordinary one.
      if (player.greatPersonOffer !== undefined) {
        reports.push({ grant: 'greatPerson', name: 'a great person', done: false });
        continue;
      }
      const offer = drawGreatPersonOffer(state, player, grant.family);
      if (offer.options.length === 0) {
        reports.push({ grant: 'greatPerson', name: 'a great person', done: false });
        continue;
      }
      player.greatPersonOffer = offer;
      reports.push({ grant: 'greatPerson', name: 'a great person', done: true });
      continue;
    }
    // A Doctrine draft.
    const sc = player.statecraft;
    if (sc.pendingDoctrine !== undefined) {
      reports.push({ grant: 'doctrineDraft', name: 'a Doctrine draft', done: false });
      continue;
    }
    const offer = drawDoctrineOffer(state, player, governmentDef(sc.government).tier);
    if (offer.options.length === 0) {
      reports.push({ grant: 'doctrineDraft', name: 'a Doctrine draft', done: false });
      continue;
    }
    sc.pendingDoctrine = offer;
    reports.push({ grant: 'doctrineDraft', name: 'a Doctrine draft', done: true });
  }

  return reports;
}

/**
 * Pays what finishing a wonder is worth in renown: the row's own lump, and the
 * Triumph a marvel raised earns on top of it.
 *
 * Beside the claim rather than inside it, because they are two different facts:
 * `claimWonderFor` settles who *has* the wonder, and this settles what building
 * it *paid*. Both go through the seams their buckets already own — the lump
 * through `settleRenownWindfall`, so a wonder that fills the ladder opens a
 * great-person offer before this returns, and the triumph through
 * `awardTriumph`, which pays through the same seam again.
 *
 * The **lump** is on the building row (`BuildingDef.renown.onComplete`), which
 * is what makes a second wonder that pays differently a JSON edit; the trickle
 * on the same row is banked by the renown phase like a library's, and neither
 * knows about the other.
 */
function payWonderRenown(state: GameState, city: City, building: BuildingId): void {
  const player = playerById(state, city.ownerId);
  if (!player) return;
  const renown = buildingDef(building).renown;
  if (renown !== undefined && (renown.onComplete ?? 0) !== 0) {
    settleRenownWindfall(state, player, [
      { family: renown.family, amount: renown.onComplete ?? 0 },
    ]);
  }
  awardOccasion(state, player.id, 'wonderCompleted');
}

/**
 * Claims a wonder for this city and settles the race for it: every other city in
 * the world stops building it, and whoever was actually paying for it is handed
 * the hammers back as gold.
 *
 * Returns the report the pipeline announces to **every** seat — a wonder is the
 * one thing in this game that is news to people who had nothing to do with it,
 * because it is the one thing they can no longer have.
 */
function claimWonderFor(state: GameState, city: City, building: BuildingId): WonderCompletion {
  const claim = claimWonder(state, building, city);
  return {
    building,
    name: buildingDef(building).name,
    cityId: claim.cityId,
    playerId: claim.playerId,
    turn: claim.turn,
    refunds: refundBeatenWonders(state, building, city),
  };
}

/**
 * Takes a claimed wonder out of every *other* city's queue and pays back what
 * was banked toward it, as gold.
 *
 * **What "banked toward it" is, exactly**: a city has one basket
 * (`City.hammerBasket`) and it pays for whatever stands at the **front** of its
 * queue (`advanceProduction` only ever looks at `queue[0]`). So the hammers are
 * toward the wonder if and only if the wonder is the front row — and then it is
 * the *whole* basket, which is emptied. A wonder standing second in a queue has
 * had nothing spent on it: the basket in that town is toward the item in front
 * of it, the row is simply removed, and the refund is zero. There is no
 * per-item ledger anywhere in this game and this rule is what keeps it that way.
 *
 * **The rate is a rule, not a constant**:
 * `production.wonderRefundGoldPerHammer`, 1 against a purchase rate of 2 — see
 * its docblock for why losing a wonder costs exactly half of what buying the
 * work would have. Floored, because a treasury is whole numbers.
 *
 * It is deliberately **not an Entry XVIII windfall**. Nothing is being *granted*:
 * these are hammers the city already banked, already staged through Entry XVII's
 * percentages on their way in, being converted to coin at a printed rate — the
 * same reasoning that keeps a project's payout out of the modifier pipeline. A
 * refund that rode `payWindfallGrants` would let a card double the consolation
 * prize for losing a race.
 *
 * Nothing here is refreshed through `refreshCityDerived`, and that is not an
 * omission: a citizen assignment is a function of ground, population and locks
 * (`assignCitizens`), and this touches a queue and a basket. The panel reads
 * both live.
 *
 * Cities are walked in `state.cities` order, so the report is in founding order
 * whichever seat is reading it.
 */
function refundBeatenWonders(
  state: GameState,
  building: BuildingId,
  winner: City,
): WonderRefund[] {
  const rate = RULES.production.wonderRefundGoldPerHammer;
  const refunds: WonderRefund[] = [];
  for (const city of state.cities) {
    if (city.id === winner.id) continue;
    const index = city.queue.findIndex(
      (item) => item.kind === 'building' && item.id === building,
    );
    if (index < 0) continue;
    city.queue.splice(index, 1);
    // Only the front row was being paid for. See the docblock.
    const hammers = index === 0 ? Math.max(0, city.hammerBasket) : 0;
    const gold = Math.floor(hammers * rate);
    if (index === 0) city.hammerBasket -= hammers;
    const player = playerById(state, city.ownerId);
    if (player) player.gold += gold;
    refunds.push({ building, cityId: city.id, playerId: city.ownerId, hammers, gold });
  }
  return refunds;
}

/**
 * The riders a completion pays out — Master Masons' culture on a wall, Rites of
 * Passage' faith on a sword.
 *
 * **Two occasions per completion**, and that is the vocabulary rather than a
 * convenience: `completion` fires for anything and `buildingCompletion` /
 * `unitCompletion` for the kind, so a card may speak about either without the
 * table having to guess which one it meant. Both are asked, so a card that named
 * the general occasion is not silently outranked by one that named the specific.
 */
function payCompletionRiders(state: GameState, city: City, kind: 'unit' | 'building'): void {
  const player = playerById(state, city.ownerId);
  if (!player) return;
  const at = { col: city.col, row: city.row };
  for (const occasion of ['completion', kind === 'unit' ? 'unitCompletion' : 'buildingCompletion'] as const) {
    const payout = windfallPayout(state, player.id, occasion);
    if (payout.grants.length === 0) continue;
    // Food a rider pays settles into growth; hammers deliberately do **not**
    // settle here, because this *is* a completion and `settleProduction` allows
    // at most one item per city per call — a rider that finished the next item
    // in the same breath would break the phase's own rule.
    for (const paid of payWindfallGrants(state, player, payout, at)) {
      settleGrowthWindfall(state, paid);
    }
  }
  // Culture a rider paid may have filled the meter. Entry XVIII says a windfall
  // settles its bucket the instant it lands, and the culture bucket's settlement
  // is a draft.
  settleCultureWindfall(state, player);
}

/**
 * The mid-turn entry point: settle, then refresh what the open panel reads.
 *
 * `settleProduction`'s wrapper for the sanctioned mid-turn mutations (Entry
 * XVIII.3 — the chop is the second, after `setLockedTiles`). The phase does not
 * want this: `collectYields` re-assigns every city at the top of the very next
 * turn, so a re-assignment inside the phase would be work with no reader. A
 * windfall has no such turn boundary behind it — the player is looking at the
 * panel *now* — so the assignment is run here for the one city that changed,
 * exactly as `setLockedTiles` and `purchaseTileAt` run it.
 *
 * Every future windfall that pays hammers calls **this**, never
 * `settleProduction` directly, so that "what does a mid-turn completion owe the
 * interface" is answered in one place.
 */
export function settleProductionWindfall(
  state: GameState,
  city: City,
): ProductionCompletion | null {
  const done = settleProduction(state, city);
  // A completed building can change what a citizen is worth on a tile, so the
  // dots are re-seated before the panel next reads them — through the one
  // helper every mid-turn mutation goes through. See `refreshCityDerived`.
  if (done) refreshCityDerived(state, city);
  return done;
}

/**
 * A one-time grant of `grant` hammers would finish *this* — or `null`.
 *
 * The preview half of the settlement check, and the reason the worker sheet does
 * no arithmetic of its own: "+20⚙ → Uruk · completes Granary!" asks
 * `planProduction` with the basket the grant would leave, so the promise on the
 * button is made by the function that will keep it. A queue item that would only
 * be *dropped* answers `null`, because nothing completes.
 */
export function productionSettledBy(
  state: GameState,
  city: City,
  grant: number,
): string | null {
  const plan = planProduction(state, city, city.hammerBasket + grant);
  if (!plan || plan.kind === 'drop') return null;
  return queueItemName(plan.item);
}

/**
 * `advanceProduction`: finish the front of every city's queue, if it can.
 *
 * At most one item completes per city per turn, exactly as Civ does it — a city
 * that banks four hundred hammers does not empty its whole queue in one turn.
 * The remainder stays in the basket and pays for the next item, which is the
 * only kind of overflow this game has.
 *
 * The completion itself is `settleProduction`, which is deliberately *not*
 * inlined here any more: a windfall settles the same queue by the same rules
 * mid-turn (Entry XVIII), and two implementations of "finish the front item"
 * would disagree about a spawn tile or an escalation ladder within a month.
 * This phase is the sweep — one city at a time, in `state.cities` order, at most
 * one item each — and nothing else.
 *
 * Four things make production *hold* rather than fail, and all four keep the
 * basket: too few hammers, a population below the item's `minCityPop` (a settler
 * queued at size 2 whose city then starved back to 1), a strategic resource the
 * owner no longer controls (the iron hill was taken while the swordsman was
 * being forged), and nowhere for a finished unit to stand. Holding is right for
 * all four because each is temporary and none is the player's mistake — the
 * alternative, silently dropping the item, would throw away the hammers with it.
 *
 * The resource check is the mirror of the one `buildError` refuses a queue with
 * (`tech.ts`), read at the other moment it can be read: refusing at the gate and
 * holding afterwards are the same rule, exactly as `minCityPop` is.
 *
 * Nothing here knows about a production modifier, and that is the point: a
 * barracks changed the *rate the basket filled at* (`collectYields`), not the
 * price of what it is paying for. This phase only ever asks whether the basket
 * covers the cost.
 *
 * Escalating costs
 * ----------------
 * A unit's price is asked of `unitProductionCost` *at every resolution*, never
 * captured when it was queued, and the counter it reads climbs the moment a
 * settler completes. So two cities each three turns into a settler are both
 * quoted the same price today, and the one that finishes first makes the other
 * dearer: the loser's item does not fail, it simply needs more hammers than it
 * did last turn, and its basket is untouched while it makes up the difference.
 *
 * That is the honest reading of "the empire's *n*-th settler costs *n* rungs",
 * and it is the only one that cannot be gamed by queuing four settlers on turn
 * one at the opening price. The panel quotes the same live number from the same
 * function, so a queue whose price has risen shows the rise immediately rather
 * than stalling against a figure the player was never shown.
 */
export function advanceProduction(state: GameState, report?: TurnReport): void {
  for (const city of state.cities) {
    const done = settleProduction(state, city);
    // A wonder is the one completion that is news to seats who had nothing to do
    // with it, so it rides out on the pipeline's report exactly as a blow the
    // wild landed does. **Contention is settled by this loop and nothing else**:
    // two empires finishing the same wonder on the same turn are two cities in
    // one sweep, the earlier one in `state.cities` order claims it, and by the
    // time the later one is reached the row is no longer in its queue (see
    // `refundBeatenWonders`) — so "first in the sweep wins" is a property of the
    // state's own order, which is founding order, and not of the wall clock.
    if (done?.wonder) report?.wonders.push(done.wonder);
    // What a finished building handed over — a free sword, a technology, a
    // Doctrine draft. News to its owner alone, unlike a wonder, but news that
    // stops existing the instant the resolution is over: by the time anybody
    // reads it the piece is on the board and the offer is on the seat.
    if (done?.grants) report?.grants.push(...done.grants);
    // And the saint a finished cathedral was dedicated to. `grants`' sibling —
    // news to its owner alone, and a difference that stops existing the moment
    // the resolution is over.
    if (done?.consecration) report?.consecrations.push(done.consecration);
  }
}

/**
 * How much a city's borders want this tile — `bestExpansionTile`'s scoring
 * function, pulled out so a test can ask it of one candidate directly.
 *
 * Four labelled terms (Ruling 2, user, 2026-08-29: "coastal cities expanding to
 * useless coastal tiles with no resources... tiles 3 hexes away should be
 * slightly more unfavored"), summed rather than folded into `yieldScore` alone:
 *
 *   1. **Yield** — the same weighted-sum reading `yieldScore` gives a citizen,
 *      against `expansion.yieldWeights` (defaults to `citizenWeights`' 3/2/1,
 *      its own table so the two can diverge later without one edit touching
 *      the other — see the docblock on `ExpansionRules`).
 *   2. **Resource** — a flat bonus when the tile carries a resource this
 *      empire's techs actually reveal (`resourceIsVisibleTo`, the same reveal
 *      rule `explainTileYield` gates the yield line on) — never an unrevealed
 *      one, which would leak the map through an AI's own choices.
 *   3. **Bare water** — a flat penalty on a water tile with *no* visible
 *      resource, which is the "useless coastal tile" the ruling names. A
 *      revealed fish still earns the resource bonus on top of its yield and is
 *      never penalised.
 *   4. **Ring** — a penalty by hex distance from the city centre
 *      (`ExpansionRules.ringPenalty`, indexed like `tilePurchase.ringBase`),
 *      so a tile at the edge of `claimRadius` is worth slightly less than an
 *      equally-good tile close in.
 */
export function expansionScore(
  state: GameState,
  city: City,
  tile: Tile,
  ctx: TileYieldContext | undefined,
): number {
  const rules = CITIES.expansion;
  let score = yieldScore(tileYieldOf(tile, ctx), rules.yieldWeights);

  const visible = tile.resource !== undefined && (!ctx || resourceIsVisibleTo(tile.resource, ctx.techs));
  if (visible) {
    score += rules.resourceBonus;
  } else if (isWaterTerrain(tile.terrain)) {
    score -= rules.bareWaterPenalty;
  }

  const ring = ringOf(state, city, tile);
  const table = rules.ringPenalty;
  if (table.length > 0) {
    const index = Math.max(0, Math.min(table.length - 1, Math.round(ring)));
    score -= table[index] ?? 0;
  }

  return score;
}

/**
 * The tile a city's borders take next: the best-scoring unclaimed tile that
 * touches the city's own territory and lies inside `claimRadius`.
 *
 * Touching its own territory is what makes a border a border rather than a
 * scatter of islands, and the radius is what stops a city three hexes from the
 * ocean claiming half of it. Ties go to the lower tile index, so the choice is a
 * pure function of the board. Scoring is `expansionScore`, not `yieldScore`
 * alone — see its docblock for the four terms.
 */
export function bestExpansionTile(state: GameState, city: City): Tile | null {
  const { map } = state;
  const centre = cityTile(map, city);
  // The same context the citizens are assigned with: a city should grow toward
  // land it would actually work, renewals included.
  const ctx = cityContext(state, city);
  let best: Tile | null = null;
  let bestScore = -Infinity;
  let bestIndex = Infinity;

  for (const tile of mapRange(map, tileHex(centre), CITIES.claimRadius)) {
    const index = tileIndex(map, tile.col, tile.row);
    if (state.tileOwner[index] !== null) continue;

    let touches = false;
    for (const neighbour of neighborTiles(map, tileHex(tile))) {
      if (state.tileOwner[tileIndex(map, neighbour.col, neighbour.row)] === city.id) {
        touches = true;
        break;
      }
    }
    if (!touches) continue;

    const score = expansionScore(state, city, tile, ctx);
    if (score > bestScore || (score === bestScore && index < bestIndex)) {
      best = tile;
      bestScore = score;
      bestIndex = index;
    }
  }
  return best;
}

/**
 * `expandBorders`: one tile per city per turn, paid for in culture.
 *
 * The excess is kept, like every other basket. A city with nowhere left to
 * expand — hemmed in by its neighbours or already out to `claimRadius` — banks
 * culture and spends none of it, which is exactly what should happen when there
 * is nothing to buy.
 *
 * Two cities reaching for the same tile in the same turn are settled by
 * `state.cities` order, and settled *cleanly*: each city's choice is made when
 * its turn in this sweep comes round, so the later city never sees the tile the
 * earlier one just took and spends its culture on its own second choice instead.
 * Nobody pays for a tile they did not get, and nobody waits a turn for losing a
 * race they could not have known about.
 *
 * A frozen empire claims nothing, even from a basket that was already full when
 * the writ went into deficit. The freeze is checked *here* as well as in the
 * accrual because the two are different guarantees: the accrual stops the basket
 * filling, and this stops a basket filled last turn from being spent this one.
 * Checked once per player, before the sweep, because it is a fact about the
 * empire and `authorityOf` walks every city to answer it.
 */
export function expandBorders(state: GameState): void {
  const grew = new Set<number>();
  const frozen = new Map<number, boolean>();
  for (const player of state.players) {
    frozen.set(player.id, bordersFrozen(meterEffects(state, player.id)));
  }
  for (const city of state.cities) {
    if (frozen.get(city.ownerId) === true) continue;
    const cost = borderCostFor(state, city);
    if (city.culture < cost) continue;
    const tile = bestExpansionTile(state, city);
    if (!tile) continue;
    if (!claimTile(state, city, tile)) continue;
    city.culture -= cost;
    city.tilesClaimed += 1;
    grew.add(city.ownerId);
  }
  // A border is a thing you patrol: ground this empire now owns is ground it can
  // see (see `visibility.ts`). Refreshed once per *player* at the end of the
  // sweep rather than once per claim, because two of one empire's cities growing
  // in the same turn is one change to that empire's map.
  for (const player of state.players) {
    if (grew.has(player.id)) recomputeVisibility(state, player.id);
  }
}

/** What a border windfall claimed, for the announcement. */
export interface BorderCompletion {
  /** The town whose bounds moved. */
  city: City;
  /** The tiles claimed, in the order they were taken. Never empty. */
  tiles: Tile[];
  /** Culture left in the town's border basket afterwards. */
  banked: number;
}

/**
 * The mid-turn entry point for the **border** bucket: culture landed in a town's
 * bounds outside the phase, so spend it now.
 *
 * Entry XVIII's fifth seam, and the register's newest entry. Consecration of the
 * Bounds pours fifteen culture into `City.culture` and, until 2026-08-27, the
 * player watched it sit there until the end of the turn — "when performing rite
 * to increase border culture, should instantaneously add the tile and reset the
 * counter (with overflow) if it exceeds the culture needed" (user). That is
 * exactly the bargain every other bucket already struck: **the moment of the
 * gift is the moment of the payoff.**
 *
 * Three things it does *not* do, each because `expandBorders` is the rule and
 * this is only the moment:
 *
 *   · it does not re-implement the claim. The tile is chosen by
 *     `bestExpansionTile` and taken by `claimTile`, which is the phase's own
 *     pair, so a rite and a good harvest reach for the same hex.
 *   · it does not skip the **freeze**. A frozen empire claims nothing, even out
 *     of a basket a blessing just filled — the phase checks it before its sweep
 *     for that exact reason and a windfall that ignored it would be the way
 *     round a rule.
 *   · it does not stop at one tile. The phase's one-per-city-per-turn is a
 *     *rate limit on accrual*, and a gift is not accrual: fifteen culture on a
 *     town two tiles from the next rung buys two, with the remainder carried,
 *     which is the "reset the counter (with overflow)" half of the sentence. The
 *     loop terminates because every claim costs at least one culture and raises
 *     the next price, and because the ground runs out.
 *
 * `null` when nothing was claimed — the culture simply stays banked, as it does
 * for a town hemmed in by its neighbours.
 */
export function settleBorderWindfall(state: GameState, city: City): BorderCompletion | null {
  if (bordersFrozen(meterEffects(state, city.ownerId))) return null;
  const tiles: Tile[] = [];
  for (;;) {
    const cost = borderCostFor(state, city);
    if (city.culture < cost) break;
    const tile = bestExpansionTile(state, city);
    if (!tile) break;
    if (!claimTile(state, city, tile)) break;
    city.culture -= cost;
    city.tilesClaimed += 1;
    tiles.push(tile);
  }
  if (tiles.length === 0) return null;
  // Ground this empire now owns is ground it can see — `expandBorders`' rule,
  // and `purchaseTileAt`'s. Once, after the loop, because however many hexes one
  // town took it is one change to one empire's map.
  recomputeVisibility(state, city.ownerId);
  refreshCityDerived(state, city);
  return { city, tiles, banked: city.culture };
}

// --- buying ground ----------------------------------------------------------

/**
 * How far through the game the world is, as a fraction in `[0, 1]`: the share of
 * the technology tree this player has researched.
 *
 * The tile price's era term, and it is *this player's* progress rather than the
 * world's on purpose. A runaway empire pays runaway prices for land while the
 * empire it left behind can still afford a hex, which is the only reading of a
 * gold sink that does not punish the player who is losing. It is also the only
 * reading that is cheap to compute deterministically — a world-wide figure would
 * make one player's research change another player's prices mid-turn.
 *
 * Counted off `TECH_IDS`, so a tech added to `data/techs.json` re-scales the
 * curve rather than breaking it, and the starting techs count: an empire that
 * opens holding agriculture has already come a little way.
 */
export function gameProgress(state: GameState, playerId: number): number {
  const player = playerById(state, playerId);
  if (!player || TECH_IDS.length === 0) return 0;
  return Math.min(1, player.techsResearched.length / TECH_IDS.length);
}

/** Hex distance from a city's centre to a cell — the ring a tile stands in. */
export function ringOf(state: GameState, city: City, cell: Cell): number {
  const { map } = state;
  const tile = getTileAt(map, cell.col, cell.row);
  if (!tile) return Infinity;
  return wrappedDistance(map, tileHex(cityTile(map, city)), tileHex(tile));
}

/**
 * Does this tile touch ground this *player* already holds?
 *
 * The frontier test. Deliberately the player's territory rather than one city's,
 * which is where this parts company with `bestExpansionTile`: culture creeps
 * outward from the town that made it, but a treasury is an empire's, and a hex
 * wedged between two of your towns is frontier by any honest reading of the map.
 */
function touchesTerritory(state: GameState, playerId: number, tile: Tile): boolean {
  const { map } = state;
  for (const neighbour of neighborTiles(map, tileHex(tile))) {
    const owner = state.tileOwner[tileIndex(map, neighbour.col, neighbour.row)];
    if (owner === null) continue;
    if (cityById(state, owner)?.ownerId === playerId) return true;
  }
  return false;
}

/** One line of a tile's asking price, signed: charges positive, discounts not. */
export interface TilePriceLine {
  source: string;
  amount: number;
}

/**
 * What a tile costs in gold, as the ordered list the total is the fold of.
 *
 * Rule 5 at the till: the price tag the Buy Tiles overlay paints on a hex is
 * this list summed, the reducer charges this list summed, and there is no second
 * implementation of the arithmetic anywhere. A player who wonders why the hex
 * across the river costs 95 gets four lines that add up to 95.
 *
 * The lines, in the order they are read:
 *
 *   1. **Ring** — `ringBase` for how far out the tile is: the near rings are one
 *      price and the outer one dearer, which is Civ 6's shape (a tile you can
 *      almost reach is cheaper than a tile at the edge of what a town can ever
 *      hold).
 *   2. **Era** — what the world's progress adds to that base. Folded into the
 *      *rounded* figure rather than being rounded on its own, so the two lines
 *      always sum to a tidy multiple of `roundTo` and the tag never reads 97.
 *   3. **Prior purchases** — `perPriorPurchase` per tile this player has ever
 *      bought. Added *after* the rounding, deliberately: the escalation is a
 *      flat surcharge on a habit, not part of the price of the ground, and
 *      rounding it in would make the first purchase silently free.
 *   4. **Luxuries** — furs' `borderCost` discount, the same −10% it takes off a
 *      culture border tile, on a line that names the reason. Land is land: an
 *      empire whose trappers know the country gets it cheaper both ways.
 *
 * A cell outside the city, or one this function is asked about before the city
 * exists, still gets a price — this evaluator prices ground and refuses nothing.
 * Whether the sale is *legal* is `tilePurchaseError`'s question, which is the
 * same split `improvementError` makes against `improvementYield`.
 */
export function explainTilePurchase(
  state: GameState,
  playerId: number,
  cityId: number,
  cell: Cell,
): TilePriceLine[] {
  const rules = CITIES.tilePurchase;
  const city = cityById(state, cityId);
  const ring = city ? ringOf(state, city, cell) : CITIES.claimRadius;
  const table = rules.ringBase;
  const index = Math.max(0, Math.min(table.length - 1, Math.round(ring)));
  const base = table[index] ?? 0;

  // Rounded once, over base *and* era together — see the docblock.
  const scaled = base * (1 + rules.progressFactor * gameProgress(state, playerId));
  const step = rules.roundTo > 0 ? rules.roundTo : 1;
  const rounded = Math.round(scaled / step) * step;

  const lines: TilePriceLine[] = [{ source: `Ring ${index}`, amount: base }];
  if (rounded !== base) lines.push({ source: 'Era', amount: rounded - base });

  const player = playerById(state, playerId);
  const prior = player?.tilesPurchased ?? 0;
  if (prior > 0 && rules.perPriorPurchase !== 0) {
    lines.push({
      source: `${prior} hexes bought before`,
      amount: rules.perPriorPurchase * prior,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  for (const line of resourceRulePercent(state, playerId, 'borderCost')) {
    // Per luxury rather than on the folded percentage, so the tag can name the
    // furs. Floored on the *subtotal* each time it is applied, which for the one
    // such luxury this game has is exactly the summed reading `borderCostFor`
    // uses; a second one would want the fold, and this is where that edit goes.
    const discount = subtotal - Math.max(1, Math.floor(subtotal * (1 + line.percent / 100)));
    if (discount === 0) continue;
    lines.push({ source: `${line.source} · ${line.percent}%`, amount: -discount });
  }

  return lines;
}

/** The total: the fold of `explainTilePurchase`, and the only place it is summed. */
export function foldTilePrice(lines: readonly TilePriceLine[]): number {
  let total = 0;
  for (const line of lines) total += line.amount;
  return total;
}

/**
 * What this tile costs this player, right now. The number the overlay prints and
 * the number the reducer charges, because it is one call to one evaluator.
 */
export function tilePurchasePrice(
  state: GameState,
  playerId: number,
  cityId: number,
  cell: Cell,
): number {
  const base = foldTilePrice(explainTilePurchase(state, playerId, cityId, cell));
  // The card discount, applied to the fold rather than as a line inside it: the
  // ladder's lines are what the *ground* costs, and Land Grants is a fact about
  // the empire buying it. Floored at 1 — free land is not a discount, it is a
  // different game.
  const percent = foldCardRulePercent(cardRulePercent(state, playerId, 'tilePurchase'));
  if (percent === 0) return Math.max(1, base);
  return Math.max(1, Math.floor((base * (100 + percent)) / 100));
}

/**
 * Why this player may not buy this tile for this city, or `null` when they may.
 *
 * The whole of the rule, in one pure function, so that the command and the
 * interface cannot disagree: the overlay greys a tag with the sentence this
 * returns, and the reducer refuses with the same sentence. That is
 * `improvementError`'s contract and `buildError`'s, one grade over.
 *
 * The six questions, in the order a player would ask them:
 *
 *   1. is there such a player, and such a city, and is the city theirs;
 *   2. is the cell on the map;
 *   3. is it unowned — a rival's ground is taken by war, not by cheque, and
 *      your *own* ground is already yours;
 *   4. is it inside the city's work radius — you buy ground a town can use;
 *   5. does it touch this empire's territory — ground is bought at the frontier,
 *      never as an island across the map;
 *   6. is the writ solvent — the freeze bars purchases as well as growth
 *      (`bordersFrozen`), because a freeze money could step around would be a
 *      freeze on the poor only;
 *   7. is there gold enough.
 *
 * **The sea is for sale** (2026-08-27). There used to be a seventh question — is
 * it land — and it was a leftover from when water was scenery. A coast hex is
 * worked ground now: Sailing's fishing boats improve it, a granary reads its
 * water line, and a citizen can be seated on it. So a harbour town buys its bay
 * on exactly the terms a farming town buys its hill, and the *distance* and
 * *frontier* clauses are what keep a seat from buying the open ocean — the same
 * two that keep it from buying a mountain range three rings out. Nothing in the
 * ladder is land-only (`explainTilePurchase` prices ring, era, habit and furs),
 * so no clause was owed a water reading.
 *
 * Adjacency is to the *player's* territory rather than to this city's, and that
 * is deliberate where `bestExpansionTile` is not: culture creeps outward from
 * the town that made it, but a treasury is an empire's, and a hex wedged between
 * two of your towns is frontier by any honest reading of the map.
 */
export function tilePurchaseError(
  state: GameState,
  playerId: number,
  cityId: number,
  cell: Cell,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const city = cityById(state, cityId);
  if (!city) return `No city with id ${String(cityId)}`;
  if (city.ownerId !== playerId) return `${city.name} does not belong to player ${playerId}`;
  // **A puppet spends nothing** (ruled 2026-09-03; schema 58) — `purchaseError`'s
  // clause said about ground. Land follows the writ and a puppet's writ is not
  // its captor's yet: annexation is the one verb that opens its purse.
  if (city.puppet === true) {
    return `${city.name} is a puppet — a puppet spends nothing; annex it to invest`;
  }

  const { map } = state;
  const tile = getTileAt(map, cell.col, cell.row);
  if (!tile) return `No tile at (${String(cell.col)}, ${String(cell.row)})`;

  const index = tileIndex(map, tile.col, tile.row);
  const owner = state.tileOwner[index];
  if (owner !== null) {
    return owner === city.id ? `${city.name} already owns this tile` : 'This tile is already owned';
  }

  if (!withinWorkRadius(state, city, tile.col, tile.row)) {
    return `Too far from ${city.name} to buy`;
  }

  if (!touchesTerritory(state, playerId, tile)) return 'Not next to your territory';

  if (bordersFrozen(meterEffects(state, playerId))) {
    return 'Borders frozen — authority is overdrawn';
  }

  const price = tilePurchasePrice(state, playerId, cityId, cell);
  if (player.gold < price) return `Costs ${price} gold; you have ${player.gold}`;

  return null;
}

/**
 * Every cell the Buy Tiles overlay has something to say about: each unowned hex
 * in the city's work radius that touches the empire, priced, with the reason
 * it cannot be had when it cannot. Water included — see `tilePurchaseError`.
 *
 * Built once per overlay rather than by asking the two evaluators per hex in a
 * render loop, and returned in tile-index order so the overlay is a pure
 * function of the board. A tile that is merely unaffordable is *in* the list with
 * its price and its reason — a grey tag that says why is the whole point of the
 * mode; a tile that is not frontier at all is not, because there is nothing to
 * say about it.
 */
export interface TileOffer {
  col: number;
  row: number;
  price: number;
  /** `null` when the player may buy it right now. */
  error: string | null;
}

export function purchasableTiles(state: GameState, city: City): TileOffer[] {
  const { map } = state;
  const owner = city.ownerId;
  const offers: TileOffer[] = [];
  // `mapRange` at the work radius answers the "too far" question by
  // construction, and the two below are what "there is nothing here to offer"
  // means: owned ground, and hexes off the frontier. They are asked
  // directly rather than by matching `tilePurchaseError`'s sentences — an error
  // string is for a player to read, never for code to branch on. There is no
  // third clause for water any more, and there must not be one: this list and
  // that evaluator are the same rule seen twice, so a filter here the reducer
  // does not keep is a hex the overlay refuses to price and the command sells.
  for (const tile of mapRange(map, tileHex(cityTile(map, city)), CITIES.workRadius)) {
    if (state.tileOwner[tileIndex(map, tile.col, tile.row)] !== null) continue;
    if (!touchesTerritory(state, owner, tile)) continue;
    const cell: Cell = { col: tile.col, row: tile.row };
    offers.push({
      col: tile.col,
      row: tile.row,
      price: tilePurchasePrice(state, owner, city.id, cell),
      // Everything left is a real offer, so whatever this says is a reason the
      // *player* cannot take it today — an empty purse, or a frozen writ.
      error: tilePurchaseError(state, owner, city.id, cell),
    });
  }
  offers.sort((a, b) => tileIndex(map, a.col, a.row) - tileIndex(map, b.col, b.row));
  return offers;
}

/**
 * Buys the tile: charges the treasury, claims the ground, climbs the escalation
 * ladder and re-seats the citizens.
 *
 * Validates nothing — `tilePurchaseError` is the rule and the command asks it
 * first. This is the mechanism, exactly as `foundCityAt` is.
 *
 * `city.tilesClaimed` is deliberately **not** raised. That counter is the input
 * to the *culture* curve, and a tile bought with gold must not make the next
 * tile a city's own culture earns any dearer — the two ladders are separate in
 * Civ 6 and separate here, and folding them together would turn the gold sink
 * into a tax on border growth. The purchase has its own ladder,
 * `Player.tilesPurchased`, which is what `explainTilePurchase` climbs.
 *
 * The citizens are re-assigned on the spot, through `refreshCityDerived` — the
 * register `setLockedTiles` opened and the trap in CLAUDE.md names: a player who
 * has just spent 95 gold on a wheat field should see the wheat in the panel
 * before the turn ends, not after it. `collectYields` re-assigns anyway and gets
 * the same answer.
 */
export function purchaseTileAt(state: GameState, city: City, tile: Tile): void {
  const player = playerById(state, city.ownerId);
  if (!player) return;
  const price = tilePurchasePrice(state, player.id, city.id, { col: tile.col, row: tile.row });
  claimTile(state, city, tile);
  player.gold -= price;
  player.tilesPurchased += 1;
  // Chartered Companies' survey. A rider on an occasion that has no figure of
  // its own, so the base is zero and only the grants are read.
  const payout = windfallPayout(state, player.id, 'tilePurchase');
  if (payout.grants.length > 0) {
    // Every bucket a rider can pay into settles here, for `settleGrowthWindfall`'s
    // reason: a grant that waited for the resolution would be a windfall the
    // player was shown and not given.
    for (const paid of payWindfallGrants(state, player, payout, { col: tile.col, row: tile.row })) {
      settleProductionWindfall(state, paid);
      settleGrowthWindfall(state, paid);
    }
    settleCultureWindfall(state, player);
  }
  refreshCityDerived(state, city);
  // Bought ground is ground you can see, the same rule `expandBorders` keeps.
  recomputeVisibility(state, player.id);
}
