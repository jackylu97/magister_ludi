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
  type ProductionCategory,
  buildingDef,
  isBuildingId,
} from './buildingData';
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
  improvementDef,
  improvementForResource,
  improvementYield,
} from './improvementData';
import {
  type ModifierStage,
  type StageSums,
  applyStages,
  foldStages,
  withStage,
} from './modifiers';
import { type Cell, isPassable } from './pathfind';
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
import { RULES } from './rulesData';
import {
  type City,
  type GameState,
  type QueueItem,
  type Unit,
  cityById,
  createCity,
  createUnit,
  playerById,
} from './state';
import {
  TERRAIN_DATA,
  TILE_YIELD_KEYS,
  type TileYield,
  emptyTileYield,
  featureDef,
  isWorkableTerrain,
  readTileYield,
  terrainDef,
} from './terrainData';
import { TECH_IDS, type TechId, techDef } from './techData';
import { type UnitTypeId, isUnitTypeId, unitDef } from './unitData';
import { hasStackingRoom } from './units';
import { recomputeVisibility } from './visibility';
import { isCoastal } from './water';
import {
  type MeterId,
  borderFactor,
  borderPercent,
  bordersFrozen,
  growthFactor,
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
} from './resourceEffects';

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
 *   · the hover readout (`tileReadout.ts`) passes the **local seat's** context,
 *     because the question it answers is "what would a city of mine collect
 *     here" — and a hover card that priced ore the seat cannot name would be
 *     giving away the one thing the reveal gate hides.
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
  return player ? { techs: player.techsResearched } : undefined;
}

/** The context of the player who owns a city. Never undefined in practice. */
function cityContext(state: GameState, city: City): TileYieldContext | undefined {
  return yieldContextFor(state, city.ownerId);
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

  // Written down even on a hill, where it is about to be overridden: the fold
  // reaches the same number, and the *list* is the explanation.
  const feature = featureDef(tile.feature);
  const override = feature.yieldOverride;
  if (override !== null) {
    list.push({ source: feature.name, kind: 'override', ...readTileYield(override) });
  }

  if (tile.hills) {
    const hills = TERRAIN_DATA.hills;
    list.push({ source: hills.name, kind: 'override', ...readTileYield(hills.yieldOverride) });
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
 *   · `improvement` — the improvement that opens it stands on the tile.
 *   · `city` — the player's **city stands on the seam**, and its owner knows
 *     how to work it. A town quarries the marble it was built on.
 */
export type ResourceVia = 'improvement' | 'city';

/** A resource in somebody's hands, and the reason it is there. */
export interface ResourceHolding {
  id: ResourceId;
  via: ResourceVia;
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
 * A resource nothing improves — fish, and the four sea luxuries, whose work boat
 * is deferred with the rest of naval — is therefore never in anybody's hands by
 * either path, which is the honest answer rather than a special case: a city
 * cannot be founded on water either.
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

  const needed = improvementForResource(id);
  if (needed === null) return null;
  if (tile.improvement === needed) return { id, via: 'improvement' };

  if (cityAt(state, tile.col, tile.row) === undefined) return null;
  const tech = improvementDef(needed).requiresTech;
  if (tech !== undefined && !player.techsResearched.includes(tech)) return null;
  return { id, via: 'city' };
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
  for (const tile of state.map.tiles) {
    if (tile.resource !== resourceId) continue;
    if (tileOwnerPlayerId(state, tile.col, tile.row) !== playerId) continue;
    if (openedResource(state, tile, playerId) !== null) return true;
  }
  return false;
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
  let copies = 0;
  for (const tile of state.map.tiles) {
    if (tile.resource !== resourceId) continue;
    if (tileOwnerPlayerId(state, tile.col, tile.row) !== playerId) continue;
    if (openedResource(state, tile, playerId) !== null) copies += 1;
  }
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
 */
export function controlledHoldings(
  state: GameState,
  playerId: number,
  kind: ResourceKind,
): ResourceHolding[] {
  const held = new Map<ResourceId, ResourceVia>();
  for (const tile of state.map.tiles) {
    if (tileOwnerPlayerId(state, tile.col, tile.row) !== playerId) continue;
    const holding = openedResource(state, tile, playerId);
    if (holding === null || resourceDef(holding.id).kind !== kind) continue;
    if (held.get(holding.id) === 'improvement') continue;
    held.set(holding.id, holding.via);
  }
  return RESOURCE_IDS.filter((id) => held.has(id)).map((id) => ({ id, via: held.get(id)! }));
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
export function yieldScore(value: TileYield): number {
  const w = CITIES.citizenWeights;
  return value.food * w.food + value.production * w.production + value.gold * w.gold;
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

/**
 * Which of a player's cities is the capital: the oldest one they *founded*, or —
 * for an empire that owns nothing but conquest — the oldest one they hold.
 *
 * There was no capital in this game before Milestone 10, so this is the rule
 * being written rather than one being read, and it is written here so that
 * everything that ever asks (the palace's happiness, the palace's authority
 * capacity, the one city that costs no authority) asks the same function.
 *
 * Oldest is `state.cities` order, which is founding order, which is id order:
 * ids are minted by a counter (see `state.ts`), so "the first city in the array"
 * is a fact about the state and not about the wall clock. Nothing is stored,
 * because nothing has to be — the answer is a pure function of the board, and a
 * stored `isCapital` would be a second thing to keep in step the day a city
 * changes hands.
 *
 * The founded-first rule is what makes a conquered palace mean something: take
 * an empire's first city and its capital moves to the oldest town it built for
 * itself, which is Civ's rule and the intuitive one. `captured` is sticky (see
 * its docblock), so a capital lost and won back does not resume the palace — the
 * empire has a new seat of government, and the old one is a prize.
 *
 * `undefined` for a player with no cities at all, which is every player on turn
 * one: a palace nobody has built supplies nothing, and the meters say so.
 */
export function capitalCityOf(state: GameState, playerId: number): City | undefined {
  let fallback: City | undefined;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    if (!city.captured) return city;
    fallback ??= city;
  }
  return fallback;
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
  const city = createCity(state, ownerId, nextCityName(state, ownerId), tile.col, tile.row);
  state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
  for (const near of mapRange(state.map, tileHex(tile), 1)) {
    claimTile(state, city, near);
  }
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
  return city;
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
 * Recomputes `city.workedTiles` from scratch: every honoured lock first, then
 * the best remaining assignable tiles by weighted yield, ties by tile index,
 * until `population` citizens are placed.
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
 */
export function assignCitizens(state: GameState, city: City): void {
  const { map } = state;
  const candidates = assignableTiles(state, city);
  const index = (tile: Tile): number => tileIndex(map, tile.col, tile.row);
  const cap = Math.max(0, city.population);

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
  for (const tile of candidates) scores.set(index(tile), yieldScore(tileYieldOf(tile, ctx)));
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

  worked.sort((a, b) => index(a) - index(b));
  city.workedTiles = worked.map((tile) => ({ col: tile.col, row: tile.row }));
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
export function productionModifiers(
  state: GameState,
  city: City,
  toward?: QueueItem | null,
  hypothetical: readonly BuildingId[] = [],
): ProductionModifier[] {
  if (!toward) return [];
  // The one place a queue item's kind is read as a bonus *category*; the two
  // types are structurally identical and this line is what keeps them so.
  const category: ProductionCategory = toward.kind;
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
export function cityYieldPercents(state: GameState, city: City): CityYieldPercent[] {
  const list: CityYieldPercent[] = [];
  for (const effect of meterEffects(state, city.ownerId)) {
    if (effect.growth) continue;
    for (const id of effect.yields) {
      list.push({
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
 */
export function cityStageSums(
  state: GameState,
  city: City,
  toward?: QueueItem | null,
  hypothetical: readonly BuildingId[] = [],
): Record<CityYieldKey, StageSums> {
  const percents = cityYieldPercents(state, city);
  const hammers = modifierPercent(productionModifiers(state, city, toward, hypothetical));
  const sums = {} as Record<CityYieldKey, StageSums>;
  for (const key of CITY_YIELD_KEYS) {
    const staged = stageSumsFor(percents, key);
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
): CityYields {
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
  for (const line of cityResourceYields(state, city)) {
    total.food += line.food;
    total.production += line.production;
    total.gold += line.gold;
    total.science += line.science;
    total.culture += line.culture;
    total.faith += line.faith;
  }

  // The fold of `explainCityBuildings`, and the only place a building's worth is
  // summed — a candidate the city already has is skipped in there, because a
  // preview that promised a second library would be a preview that lies.
  for (const entry of explainCityBuildings(state, city, hypothetical)) {
    total.food += entry.food;
    total.production += entry.production;
    total.gold += entry.gold;
    total.culture += entry.culture;
    total.science += entry.science;
    // Floored per *entry* rather than per building, which is the same rule the
    // old per-building floor was: two half-science sources must pay for two
    // halves rather than round into a free point.
    total.science += Math.floor(city.population * entry.sciencePerPop);
  }

  // Entry XVII, and the only place in the simulation a yield meets a percentage.
  // The hammers behind *this build* join the city stage rather than standing
  // beside it, because a barracks is a fact about the town in exactly the way
  // marble and a market are; the meters wait for the second multiplication.
  const sums = cityStageSums(state, city, toward, hypothetical);
  for (const key of CITY_YIELD_KEYS) total[key] = applyStages(total[key], sums[key]);

  return total;
}

/** What the citizens eat: `foodPerCitizen` each. */
export function foodUpkeep(city: City): number {
  return city.population * CITIES.foodPerCitizen;
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
  const factor = growthFactor(meterEffects(state, city.ownerId));
  // Floored, so the basket stays whole: the panel prints it, the threshold is a
  // whole number, and a fraction of a bushel banked forever is a fraction that
  // eventually decides a growth turn nobody can account for.
  return factor >= 1 ? surplus : Math.floor(surplus * factor);
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
  const percent = foldRulePercent(resourceRulePercent(state, city.ownerId, 'borderCost'));
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
  const frozen = bordersFrozen(effects);
  const factor = borderFactor(effects);
  const base = yields.culture;
  const perTurn = Math.floor(base * factor);
  const cost = borderCostFor(state, city);
  return {
    base,
    percent: borderPercent(effects),
    frozen,
    perTurn,
    banked: city.culture,
    cost,
    turns: turnsToFill(cost - city.culture, perTurn),
  };
}

/**
 * What one unit of this type costs *this player, right now*: its base cost plus
 * `costIncrement` for every escalating unit they have already built.
 *
 * The one evaluator (Entry VIII). `advanceProduction` charges through it, the
 * city panel prices its buildable rows and its queue rows through it, the
 * banners and the panel estimate turns through it, and the tech screen quotes a
 * not-yet-unlocked unit through it — so the number on the button is the number
 * the city pays, and no second implementation can drift out from under the
 * first. A type with no `costIncrement` passes straight through, which is every
 * unit but the settler.
 *
 * An unknown player is priced at base rather than refused: this is a display and
 * charging function, and the caller that could be handed a stale id is the UI.
 */
export function unitProductionCost(
  state: GameState,
  playerId: number,
  type: UnitTypeId,
): number {
  const def = unitDef(type);
  // Presence of the field is the marker, here and in `advanceProduction`: a
  // designer who writes an increment of zero has declared an escalating type
  // whose ladder is currently flat, not a flat type.
  const increment = def.costIncrement;
  if (increment === undefined) return def.cost;
  const player = playerById(state, playerId);
  return def.cost + increment * (player?.settlersBuilt ?? 0);
}

/**
 * Hammers the item at the front of a queue costs *this player*, or `null` if it
 * is unknown. Units are priced by `unitProductionCost`; buildings are flat.
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
  return isBuildingId(item.id) ? buildingDef(item.id).cost : null;
}

/** The display name of a queue item, or its raw id if the id is unknown. */
export function queueItemName(item: QueueItem): string {
  if (item.kind === 'unit') return isUnitTypeId(item.id) ? unitDef(item.id).name : item.id;
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
 */
export function turnsToBuild(
  state: GameState,
  city: City,
  item: QueueItem,
  index: number,
): number | null {
  const cost = queueItemCost(state, city.ownerId, item);
  if (cost === null) return null;
  const banked = index === 0 ? city.hammerBasket : 0;
  // The rate *for this item*: a barracks city fills its basket faster while a
  // unit is at the front and at the plain rate otherwise, so an estimate that
  // divided by the city's unmodified production would promise a schedule the
  // basket beats. See `cityYields`'s `toward`.
  return turnsToFill(cost - banked, cityYields(state, city, [], item).production);
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
export function collectYields(state: GameState): void {
  for (const city of state.cities) {
    assignCitizens(state, city);
    const yields = cityYields(state, city, [], city.queue[0]);

    // Upkeep, the settler halt and the happiness stifle, all in one function so
    // that what the panel promised is what the basket receives.
    city.foodBasket += growthSurplus(state, city, yields);
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
    // The faithful gather. Nothing spends this yet — see `Player.faithPool`.
    player.faithPool += yields.faith;
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
  const percent = foldRulePercent(resourceRulePercent(state, city.ownerId, 'growthCarryover'));
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
  return { city, population: plan.population };
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
  if (done) refreshCityDerived(state, city);
  return done;
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
export function growCities(state: GameState): void {
  for (const city of state.cities) {
    if (settleGrowth(state, city) !== null) continue;
    if (city.foodBasket <= CITIES.starvationShrinksAt) {
      city.population = Math.max(1, city.population - 1);
      city.foodBasket = 0;
    }
  }
}

/**
 * Where a unit built in this city can stand: the city tile if its category has
 * room, otherwise the first neighbour in `HEX_DIRECTIONS` order that is passable
 * and has room. `null` when the city is completely boxed in.
 */
function spawnTileFor(state: GameState, city: City, type: UnitTypeId): Tile | null {
  const { category } = unitDef(type);
  const centre = cityTile(state.map, city);
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
  | { kind: 'unit'; item: QueueItem; id: UnitTypeId; cost: number; tile: Tile }
  | { kind: 'building'; item: QueueItem; id: BuildingId; cost: number }
  | { kind: 'drop'; item: QueueItem };

export function planProduction(
  state: GameState,
  city: City,
  hammers: number = city.hammerBasket,
): ProductionPlan | null {
  const item = city.queue[0];
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
    return { kind: 'unit', item, id, cost, tile };
  }

  if (!isBuildingId(item.id)) return null;
  const id: BuildingId = item.id;
  // Only reachable from a hand-edited save or a queue built before the
  // building finished some other way; drop it rather than blocking the queue.
  if (city.buildings.includes(id)) return { kind: 'drop', item };
  const cost = buildingDef(id).cost;
  if (hammers < cost) return null;
  return { kind: 'building', item, id, cost };
}

/** What a settlement did, for the caller that has to say so out loud. */
export interface ProductionCompletion {
  city: City;
  item: QueueItem;
  /** The display name of what completed — "Granary", "Settler". */
  name: string;
  /** Hammers taken out of the basket. What is left is the overflow. */
  cost: number;
  /** The unit that was spawned, when the item was a unit. */
  unitId?: number;
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
export function settleProduction(state: GameState, city: City): ProductionCompletion | null {
  const plan = planProduction(state, city);
  if (!plan) return null;

  if (plan.kind === 'drop') {
    city.queue.shift();
    return null;
  }

  city.hammerBasket -= plan.cost;
  city.queue.shift();
  const done: ProductionCompletion = {
    city,
    item: plan.item,
    name: queueItemName(plan.item),
    cost: plan.cost,
  };

  if (plan.kind === 'building') {
    city.buildings.push(plan.id);
    return done;
  }

  // A unit comes into the world through `createUnit` whoever asked for it, so a
  // unit finished mid-turn by a windfall is born exactly as one finished by the
  // phase: full movement, unspent attack, eyes opened. It can therefore *act*
  // on the turn a chop paid for it, which is the honest reading of "the moment
  // of the gift is the moment of the payoff" (Entry XVIII.2) and is the same
  // rule the `spawnUnit` harness command already lives by.
  const unit = createUnit(state, city.ownerId, plan.id, plan.tile.col, plan.tile.row);
  done.unitId = unit.id;
  // The ladder climbs at completion, so the next settler — anywhere in the
  // empire — is dearer from the very next resolution. See `advanceProduction`.
  if (unitDef(plan.id).costIncrement !== undefined) {
    const player = playerById(state, city.ownerId);
    if (player) player.settlersBuilt += 1;
  }
  return done;
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
export function advanceProduction(state: GameState): void {
  for (const city of state.cities) {
    settleProduction(state, city);
  }
}

/**
 * The tile a city's borders take next: the best-scoring unclaimed tile that
 * touches the city's own territory and lies inside `claimRadius`.
 *
 * Touching its own territory is what makes a border a border rather than a
 * scatter of islands, and the radius is what stops a city three hexes from the
 * ocean claiming half of it. Ties go to the lower tile index, so the choice is a
 * pure function of the board.
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

    const score = yieldScore(tileYieldOf(tile, ctx));
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
      source: `Bought ${prior} before`,
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
  return Math.max(1, foldTilePrice(explainTilePurchase(state, playerId, cityId, cell)));
}

/**
 * Why this player may not buy this tile for this city, or `null` when they may.
 *
 * The whole of the rule, in one pure function, so that the command and the
 * interface cannot disagree: the overlay greys a tag with the sentence this
 * returns, and the reducer refuses with the same sentence. That is
 * `improvementError`'s contract and `buildError`'s, one grade over.
 *
 * The seven questions, in the order a player would ask them:
 *
 *   1. is there such a player, and such a city, and is the city theirs;
 *   2. is the cell on the map, and is it land — the sea is nobody's to sell;
 *   3. is it unowned — a rival's ground is taken by war, not by cheque, and
 *      your *own* ground is already yours;
 *   4. is it inside the city's work radius — you buy ground a town can use;
 *   5. does it touch this empire's territory — land is bought at the frontier,
 *      never as an island across the map;
 *   6. is the writ solvent — the freeze bars purchases as well as growth
 *      (`bordersFrozen`), because a freeze money could step around would be a
 *      freeze on the poor only;
 *   7. is there gold enough.
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

  const { map } = state;
  const tile = getTileAt(map, cell.col, cell.row);
  if (!tile) return `No tile at (${String(cell.col)}, ${String(cell.row)})`;
  if (terrainDef(tile.terrain).water) return 'The sea is not for sale';

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
 * Every cell the Buy Tiles overlay has something to say about: each unowned land
 * hex in the city's work radius that touches the empire, priced, with the reason
 * it cannot be had when it cannot.
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
  // construction, and the three below are what "there is nothing here to offer"
  // means: owned ground, sea, and hexes off the frontier. They are asked
  // directly rather than by matching `tilePurchaseError`'s sentences — an error
  // string is for a player to read, never for code to branch on.
  for (const tile of mapRange(map, tileHex(cityTile(map, city)), CITIES.workRadius)) {
    if (state.tileOwner[tileIndex(map, tile.col, tile.row)] !== null) continue;
    if (terrainDef(tile.terrain).water) continue;
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
  refreshCityDerived(state, city);
  // Bought ground is ground you can see, the same rule `expandBorders` keeps.
  recomputeVisibility(state, player.id);
}
