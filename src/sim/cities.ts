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
import { isPassable } from './pathfind';
import {
  RESOURCE_IDS,
  type ResourceId,
  type ResourceKind,
  resourceDef,
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
  type TileYield,
  featureDef,
  isWorkableTerrain,
  terrainDef,
} from './terrainData';
import { type TechId, techDef } from './techData';
import { type UnitTypeId, isUnitTypeId, unitDef } from './unitData';
import { hasStackingRoom } from './units';
import { recomputeVisibility } from './visibility';
import { isCoastal } from './water';
import { growthFactor, meterEffects, yieldFactor } from './meters';
import {
  cityResourceYields,
  empireResourceYields,
  foldResourceYields,
  resourceProduction,
} from './resourceEffects';

const CITIES = RULES.cities;

/** Everything a city produces in one turn. */
export interface CityYields {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
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
 * Everything above the renewals is a fact about the *tile*. A renewal is a fact
 * about the tile **and its owner** — Feudalism gives freshwater farms a second
 * food, and only to the empire that researched it — so it needs a player, and a
 * function that took a whole `GameState` would drag this module into an import
 * cycle with `tech.ts` (which already depends on it). `TileYieldContext` is
 * therefore the minimum the evaluation actually needs: the technologies held.
 *
 * `explainTileYield(tile)` with no context is exactly the pre-M7 answer plus the
 * improvement's own flat add, and it is the right call for anything asking about
 * *ground* rather than about an empire. Who passes what is written down in the
 * `yieldContextFor` docblock, because a call site that quietly stopped passing
 * one would under-report a renewal and nothing would fail.
 */
export type TileYieldKind = 'base' | 'override' | 'add';

export interface TileYieldContribution {
  /** Display label: the terrain, the feature, the resource, the tech. */
  source: string;
  kind: TileYieldKind;
  food: number;
  production: number;
  gold: number;
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
 * is only useful where somebody will read it:
 *
 *   · `assignCitizens`, `centreYield`, `cityYields`, `bestExpansionTile` — all
 *     pass the *city owner's* context. Those four are the simulation banking and
 *     spending real yields, and a citizen that ignored a renewal would be sent
 *     to the wrong tile the turn Feudalism landed.
 *   · the hover readout (`showTileYields` in `main.ts`) passes the **local
 *     seat's** context, because the question it answers is "what would a city of
 *     mine collect here".
 *   · the yield glyphs (`lens3d.ts`) pass `LensView.playerId`, the seat the lens
 *     is drawn for, so the board and the hover card agree.
 *   · the citizen *score* used by the border chooser and the assigner is the
 *     fold of the same contextual list, so "grow toward land you would work"
 *     survives a renewal.
 *   · nobody else passes one, and the two that deliberately do not are the
 *     improvement preview (`improvementYieldDelta`, which quotes the flat add a
 *     charge buys *now*) and any test asking about bare ground.
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
  const base = terrain.yield;
  list.push({
    source: terrain.name,
    kind: 'base',
    food: base.food,
    production: base.production,
    gold: base.gold,
  });

  // Written down even on a hill, where it is about to be overridden: the fold
  // reaches the same number, and the *list* is the explanation.
  const feature = featureDef(tile.feature);
  const override = feature.yieldOverride;
  if (override !== null) {
    list.push({
      source: feature.name,
      kind: 'override',
      food: override.food,
      production: override.production,
      gold: override.gold,
    });
  }

  if (tile.hills) {
    const hills = TERRAIN_DATA.hills;
    list.push({
      source: hills.name,
      kind: 'override',
      food: hills.yieldOverride.food,
      production: hills.yieldOverride.production,
      gold: hills.yieldOverride.gold,
    });
  }

  if (tile.resource !== undefined) {
    const extra = resourceYield(tile.resource);
    list.push({
      source: resourceDef(tile.resource).name,
      kind: 'add',
      food: extra.food,
      production: extra.production,
      gold: extra.gold,
    });
  }

  const improvement = tile.improvement;
  if (improvement !== undefined) {
    const def = improvementDef(improvement);
    const extra = improvementYield(improvement);
    list.push({
      source: def.name,
      kind: 'add',
      food: extra.food,
      production: extra.production,
      gold: extra.gold,
    });
    // The renewals, each its own entry, and only for an empire that has earned
    // them. Walked in the table's own order so two renewals on one improvement
    // always read in the same order (design ledger, Entry I).
    for (const upgrade of def.upgrades ?? []) {
      if (!ctx || !ctx.techs.includes(upgrade.tech)) continue;
      if (upgrade.requiresFreshwater && !tile.freshwater) continue;
      list.push({
        source: techDef(upgrade.tech).name,
        kind: 'add',
        food: upgrade.add.food,
        production: upgrade.add.production,
        gold: upgrade.add.gold,
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
  const total: TileYield = { food: 0, production: 0, gold: 0 };
  for (const entry of list) {
    if (entry.kind === 'add') {
      total.food += entry.food;
      total.production += entry.production;
      total.gold += entry.gold;
    } else {
      total.food = entry.food;
      total.production = entry.production;
      total.gold = entry.gold;
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
 * The resource a tile puts in its owner's hands, or `null` when it puts none
 * there — either because there is nothing on it, or because nobody has built
 * the improvement that opens what is.
 *
 * The rule itself, factored out so that the two questions asked of it cannot
 * drift: `hasResource` asks it of one named resource, `controlledResources`
 * asks it of a whole kind at once. Which improvement opens which resource is
 * `improvesResource` in `data/improvements.json`, inverted once at load.
 */
function openedResource(tile: Tile): ResourceId | null {
  const id = tile.resource;
  if (id === undefined) return null;
  const needed = improvementForResource(id);
  if (needed === null || tile.improvement !== needed) return null;
  return id;
}

/**
 * Does this player *control* this resource — own a tile carrying it, with the
 * improvement that opens it built?
 *
 * The Entry IX correction, landed. The v1 reading was ownership alone, and the
 * note beside it said exactly why: there were no workers, so requiring a pasture
 * would have made every mounted unit permanently unbuildable. Workers exist now,
 * so the clause the note promised is here, and it is the *only* thing that
 * changed — the reducer, the city panel and the production gate all still ask
 * this one function.
 *
 * Which improvement opens which resource is `improvesResource` in
 * `data/improvements.json`, inverted once at load (`improvementForResource`).
 * A resource nothing improves — fish, whose work boat is deferred with the rest
 * of naval — is therefore never controlled by anybody, which is the honest
 * answer rather than a special case: nothing in the game is gated on it yet.
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
    if (openedResource(tile) !== resourceId) continue;
    if (tileOwnerPlayerId(state, tile.col, tile.row) === playerId) return true;
  }
  return false;
}

/**
 * Every resource of one kind this player controls, **once each**, in the
 * resource table's own order.
 *
 * `hasResource` asked of a whole kind, in one pass rather than one pass per
 * resource — and uniqueness is not a rule this has to enforce, it is what the
 * question *is*: two improved silk seams are one silk in the player's hands.
 * That is precisely what the happiness meter buys (design ledger XIV.D.3, "+4
 * per unique improved luxury"), and pricing it off this list rather than off a
 * count of tiles is what stops a plantation belt paying twice.
 *
 * The table's order rather than discovery order, so the breakdown a player reads
 * lists their luxuries the same way twice running — iteration order that is part
 * of the answer is iteration order a replay has to reproduce.
 */
export function controlledResources(
  state: GameState,
  playerId: number,
  kind: ResourceKind,
): ResourceId[] {
  const held = new Set<ResourceId>();
  for (const tile of state.map.tiles) {
    const id = openedResource(tile);
    if (id === null || resourceDef(id).kind !== kind) continue;
    if (tileOwnerPlayerId(state, tile.col, tile.row) === playerId) held.add(id);
  }
  return RESOURCE_IDS.filter((id) => held.has(id));
}

/**
 * The same question one scale down: every resource of a kind that **this city**
 * controls, once each, in the resource table's own order.
 *
 * The city scale exists because half the luxury vocabulary is local — a
 * signature that pays "in the city that owns the improved tile" needs to know
 * which city that is (`resourceEffects.ts`). It asks `openedResource`, the same
 * one rule `controlledResources` asks, so a pillaged plantation stops paying
 * both at once and neither has any bookkeeping of its own.
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
    const id = openedResource(tile);
    if (id === null || resourceDef(id).kind !== kind) continue;
    held.add(id);
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
  // recomputes this anyway, and gets the same answer.
  assignCitizens(state, city);
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

// --- yields -----------------------------------------------------------------

/**
 * What the city centre pays: the larger of its own terrain yield and
 * `baseCityYields`, field by field.
 *
 * A city is a city wherever it stands — one planted on snow still feeds itself —
 * but a city on a hill keeps the hill's production. Taking the maximum rather
 * than replacing outright is what gives both.
 */
export function centreYield(state: GameState, city: City): TileYield {
  const own = tileYieldOf(cityTile(state.map, city), cityContext(state, city));
  const base = CITIES.baseCityYields;
  return {
    food: Math.max(own.food, base.food),
    production: Math.max(own.production, base.production),
    gold: Math.max(own.gold, base.gold),
  };
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
    list.push({ source: buildingDef(id).name, building: id, percent: bonus.percent });
  }
  for (const line of resourceProduction(state, city, category)) {
    if (line.percent === 0) continue;
    list.push({ source: line.source, resource: line.resource, percent: line.percent });
  }
  return list;
}

/** What the modifiers multiply production by: summed, then applied once. */
function modifierFactor(list: readonly ProductionModifier[]): number {
  let percent = 0;
  for (const entry of list) percent += entry.percent;
  return percent / 100;
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
 * how they touch the economy (design ledger, Entry XIV). Production, science and
 * culture are each multiplied once by the sum of whatever percentages the two
 * meters currently apply to them — plus, for production, whatever the buildings
 * put behind this particular item — and then floored. That is the same "floor
 * once, at the end" the science-per-pop terms above already keep, so a +10% on 7
 * hammers is 7 and not a rounding gift, and a barracks in an overstretched
 * empire is one multiplication and not two roundings.
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
    science: Math.floor(city.population * CITIES.sciencePerPop),
    culture: CITIES.baseCulturePerCity,
  };

  const ctx = cityContext(state, city);
  for (const cell of city.workedTiles) {
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) continue;
    const value = tileYieldOf(tile, ctx);
    total.food += value.food;
    total.production += value.production;
    total.gold += value.gold;
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

  const effects = meterEffects(state, city.ownerId);
  const hammers = modifierFactor(productionModifiers(state, city, toward, hypothetical));
  if (effects.length > 0 || hammers !== 0) {
    total.production = Math.floor(
      total.production * (yieldFactor(effects, 'production') + hammers),
    );
    total.science = Math.floor(total.science * yieldFactor(effects, 'science'));
    total.culture = Math.floor(total.culture * yieldFactor(effects, 'culture'));
  }

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
    city.culture += yields.culture;

    const player = playerById(state, city.ownerId);
    if (!player) continue;
    player.gold += yields.gold;
    player.sciencePool += yields.science;
    player.culturePool += yields.culture;
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
  }
}

/**
 * `growCities`: spend a full basket on a population point, or starve.
 *
 * Growth keeps the overflow and starvation does not: a city that grows carries
 * its surplus toward the next point, while a city that starves has its debt
 * written off along with the citizen who paid it. A negative basket that
 * survived would charge the same debt again next turn.
 */
export function growCities(state: GameState): void {
  for (const city of state.cities) {
    const threshold = growthThreshold(city.population);
    if (city.foodBasket >= threshold) {
      city.foodBasket -= threshold;
      city.population += 1;
      continue;
    }
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
 * `advanceProduction`: finish the front of every city's queue, if it can.
 *
 * At most one item completes per city per turn, exactly as Civ does it — a city
 * that banks four hundred hammers does not empty its whole queue in one turn.
 * The remainder stays in the basket and pays for the next item, which is the
 * only kind of overflow this game has.
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
    const item = city.queue[0];
    if (!item) continue;

    if (item.kind === 'unit') {
      if (!isUnitTypeId(item.id)) continue;
      const def = unitDef(item.id);
      if (city.population < def.minCityPop) continue;
      if (def.requiresResource !== undefined && !hasResource(state, city.ownerId, def.requiresResource)) {
        continue;
      }
      const cost = unitProductionCost(state, city.ownerId, item.id);
      if (city.hammerBasket < cost) continue;
      const tile = spawnTileFor(state, city, item.id);
      if (!tile) continue;
      city.hammerBasket -= cost;
      city.queue.shift();
      createUnit(state, city.ownerId, item.id, tile.col, tile.row);
      // The ladder climbs at completion, so the next settler — anywhere in the
      // empire — is dearer from the very next resolution. See the docblock.
      if (def.costIncrement !== undefined) {
        const player = playerById(state, city.ownerId);
        if (player) player.settlersBuilt += 1;
      }
      continue;
    }

    if (!isBuildingId(item.id)) continue;
    const id: BuildingId = item.id;
    // Only reachable from a hand-edited save or a queue built before the
    // building finished some other way; drop it rather than blocking the queue.
    if (city.buildings.includes(id)) {
      city.queue.shift();
      continue;
    }
    const def = buildingDef(id);
    if (city.hammerBasket < def.cost) continue;
    city.hammerBasket -= def.cost;
    city.queue.shift();
    city.buildings.push(id);
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
 */
export function expandBorders(state: GameState): void {
  const grew = new Set<number>();
  for (const city of state.cities) {
    const cost = nextBorderCost(city.tilesClaimed);
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
