/**
 * Everything a city *is*: territory, citizens, growth, production and borders.
 *
 * **What a city yields is one folder over** (batch E3b —
 * `docs/audit/evaluations.md` §4b step 9, *files by layer, not by topic*): the
 * sequence of `docs/yields.md` lives in `yields/hex.ts` (what one tile pays),
 * `yields/town.ts` (the twelve steps), `yields/empire.ts` (the seat's own list
 * and `collectYields`, the phase that banks it) and `yields/stages.ts` (Entry
 * XVII's two multiplications). Those four import this file back for the
 * territory and the citizens they price — a function-level cycle, the
 * documented kind, and `test/mapgen/moduleCycles.test.ts` is the gate. This
 * file does **not** re-export them: a caller names the layer it wants.
 *
 * Pure logic over `GameState`. The end-of-turn phases in `turn.ts` are four
 * one-line calls into this module and the one beside it, and the `foundCity` /
 * `setCityProduction` commands validate in `commands.ts` and then call in here
 * to do the work — so the rules of a city live beside each other, and the
 * reducer stays a reducer.
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
  type BuildingId,
  type BuildingSize,
  type CompletionGrant,
  buildingDef,
  isBuildingId,
  isWonder,
} from './buildingData';
// The two sides of the lending rule (schema 57). `deals.ts` is a leaf — it
// imports `state.ts`, the resource table and the rule book and stops there — so
// the largest module in the simulation may read it without a shape of cycle.
import { type LentCopies, lentCopiesAwayBy, lentCopiesToPlayer } from './deals';
// The class a breakdown line carries, decided once where the line is made — a
// leaf above nothing but the data tables, so the simulation can name a slice
// without importing a screen (batch E2). See `ledgerClass.ts`.
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
  isGreatPersonWork,
} from './improvementData';
import { type Cell, type MoveProfile, findPath, isPassable, moveProfile, tileMoveCost } from './pathfind';
import {
  RESOURCE_IDS,
  type ResourceId,
  type ResourceKind,
  resourceDef,
  resourceIsVisibleTo,
} from './resourceData';
import { type ProjectId, isProjectId, projectDef, projectFinishes } from './projectData';
import { governmentDef } from './statecraftData';
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
import { type CitizenFocus, type CitizenLean, type CitizenWeights, RULES } from './rulesData';
import {
  cardActionRule,
  cardMeterFlag,
  cardFoundingRider,
  cardRulePercent,
  cityHasFreshwater,
  cardProjectPays,
  drawDoctrineOffer,
  forgetTheLaw,
  foldCardRulePercent,
  payWindfallGrants,
  recordWorldScalingOccasion,
  settleCultureWindfall,
  windfallPayout,
} from './statecraft';
import {
  type City,
  type GameState,
  type Player,
  type QueueItem,
  type Unit,
  cityById,
  claimWonder,
  createCity,
  createUnit,
  hasEndedTurn,
  playerById,
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
import { type TileYield, isWaterTerrain, isWorkableTerrain } from './terrainData';
import {
  BUILDING_UNLOCK_TECH,
  TECH_IDS,
  type TechId,
  UNIT_UNLOCK_TECH,
  isTechId,
  techColumn,
  techDef,
} from './techData';
// **A function-level cycle, and the mirror of one that already existed**:
// `tech.ts` asks this module what a city yields, and since the wonders' roster
// this module asks `tech.ts` what an empire may build (the Statue of Zeus' best
// melee) and finishes a technology outright (the Great Library's). Everything at
// the top level of both files is a constant from a data table, which is the
// condition the whole simulation's cycles are safe under — see the docblock in
// `statecraft.ts`.
import { buildError, isUnlocked, settleResearchWindfall } from './tech';
import {
  UNIT_TYPE_IDS,
  type ModelClass,
  type UnitSize,
  type UnitStamp,
  type UnitTypeId,
  isNaval,
  isUnitTypeId,
  unitDef,
} from './unitData';
import { hasStackingRoom } from './units';
import { recomputeVisibility } from './visibility';
import { isCoastal } from './water';
import { borderFactor, borderPercent, bordersFrozen, growthPercent, meterEffects } from './meters';
import { foldRulePercent, resourceRulePercent } from './resourceEffects';
import { buildingUnitUpkeepRebate, cityIsWatered } from './buildingEffects';
// A leaf, like `roads.ts` and `routeYields.ts`, and imported for the same
// reason: `guilds.ts` needs these answers too and must be free to import this
// file. See `specialists.ts`.
import { totalSpecialists } from './specialists';
// **This file no longer imports `trade.ts`, and that is a rule** (2026-08-28).
// It used to, for the three readers below, while `trade.ts` imported this file
// back for the capital, the tile owner and the windfall settlements — a
// load-time cycle between the two largest modules in the simulation, which
// surfaced once as a `foldTile is not a function` at test load and would have
// surfaced in a browser next. The three readers now live on the far side of
// nothing: `routeYields.ts` and `empireGold.ts` import neither this module nor
// `trade.ts`, `trade.ts` re-exports them so no screen changed its import, and
// `test/sim/cities.test.ts` reads this source and fails if `./trade` comes back.
// **A leaf, deliberately** (2026-08-28): the road writer and the roster's
// caravan both moved out of `trade.ts` so that this file's *founding* verb — The
// Founders' Road — reaches them without crossing the cycle it once documented.
import { layRoad } from './roads';
import { caravanTypeId } from './unitData';
import { awardFoundingTriumphs, awardOccasion } from './triumphs';
// **A function-level cycle, and the documented kind** (CLAUDE.md): `religion.ts`
// imports this file for the capital, the tile-owner field and the windfall
// settlements, and this one arm of `payCompletionGrants` imports it back for the
// faith ladder's deal. Neither module *runs* the other at load — nothing at the
// top level of `religion.ts` calls into this file, and nothing here calls into
// it outside a function — which is the whole of what makes a cycle safe, and it
// is what `test/mapgen/moduleCycles.test.ts` checks by loading every module as
// an entry. A grant that reimplemented the deal to dodge the import would be a
// second way to open a consecration, which is the thing worth avoiding.
import { openFreeRung } from './religion';
import { type TileYieldContext, cityContext, foldTile, yieldContextFor } from './yields/hex';
import { type CityReading, foldCity } from './yields/town';

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
 *     than out of `openedResource`; see `lentCopiesToPlayer` (`deals.ts`).
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
 * It is a question about **ground**, and since the copies ruling (flags (tt))
 * that is all it is: what an empire has promised across a table is arithmetic on
 * top of this answer, done once in `resourceCopies`, and the clause that used to
 * sit second here is gone. See the note where it stood.
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

  // **There is no lending clause here, and that is the ruling** (the user,
  // 2026-09-08 — flags (tt)). A deal used to be asked at this line, and the
  // giver's every tile of a promised kind answered `null`: an empire with two
  // amber that lent one kept neither, and the ground it stood on stopped paying
  // as though the plantation had been dug up. Lending is a *signature* crossing
  // a table, never the seam itself — so the arithmetic moved whole to
  // `resourceCopies` below, where a copy given and a copy received are the same
  // subtraction seen from two chairs, and this rule went back to answering the
  // one question it is named for: what does this hex put in this empire's hands.
  //
  // The tile therefore goes on paying its owner (rule 5's `explainTileYield`
  // reads the same three clauses), which is Civ's model and the only reading
  // under which a player who traded a spare amber for marble ends the turn with
  // two unique luxuries rather than one.

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
  // **Net copies above nothing**, which is the copies ruling said as a boolean:
  // an empire with two amber that lent one still has amber, an empire that lent
  // its only one does not, and a caravan somebody sent counts like a seam. One
  // arithmetic rather than two readings that could disagree — `resourceCopies`
  // is where the whole of the lending rule lives.
  return resourceCopies(state, playerId, resourceId) > 0;
}

/**
 * The copies lent **to** this empire under live deals, the reveal gate applied.
 *
 * The receiver's half of the lending rule, and the reason it could never be a
 * clause in `openedResource`: that rule answers about a *tile*, and the empire
 * being paid owns no tile carrying the seam. Since the copies ruling neither
 * half is a clause there — both are arithmetic at empire scale, done in
 * `resourceCopies` and read from it by `hasResource` and `controlledHoldings`.
 *
 * **The reveal gate binds the receiver** (`resourceIsVisibleTo`), the same first
 * clause `openedResource` opens with: a people with no word for silk draw
 * nothing from a caravan of it, whoever sent it. A copy withheld by the gate is
 * dropped rather than counted, so a receiver who learns the word later gains the
 * caravan on the turn they learn it and nothing has to remember to say so.
 */
function lentCopiesHeld(state: GameState, playerId: number): LentCopies {
  const player = playerById(state, playerId);
  if (!player) return {};
  const sent = lentCopiesToPlayer(state, playerId);
  const kept: LentCopies = {};
  for (const id of RESOURCE_IDS) {
    const count = sent[id] ?? 0;
    if (count === 0) continue;
    if (!resourceIsVisibleTo(id, player.techsResearched)) continue;
    kept[id] = count;
  }
  return kept;
}

/**
 * Every luxury lent to this empire, as holdings — one per kind, `via: 'lent'`.
 *
 * The label half of `lentCopiesHeld`: a ledger line saying "Silk · lent" wants a
 * holding, and the arithmetic wants a count, so the count is the reading and
 * this is one `map` over it. Uniqueness per kind, exactly as an empire's own
 * holdings are — two caravans of silk are one silk on the happiness meter, and
 * how many there are is `resourceCopies`' answer, not this one's.
 */
function lentHoldings(state: GameState, playerId: number): ResourceHolding[] {
  const held = lentCopiesHeld(state, playerId);
  return RESOURCE_IDS.filter((id) => (held[id] ?? 0) > 0).map((id) => ({
    id,
    via: 'lent' as const,
    improvement: null,
  }));
}

/**
 * How many copies of one resource this player holds — **the net figure**, and
 * the one place the lending rule is arithmetic.
 *
 * Opened tiles, minus the copies this empire has promised away, floored at
 * nothing, plus the copies somebody has lent it:
 *
 *   · **the tiles** are `openedResource` asked of every hex this empire owns, so
 *     a pillaged silver mine stops being a copy at exactly the moment it stops
 *     being a holding;
 *   · **minus what was promised** — one per deal row naming the kind (flags
 *     (tt), the user's two amber). Floored, because a save hand-edited into
 *     promising three amber from two seams must not lend the third out of a
 *     negative number;
 *   · **plus what was promised to it**, which is a fact about a table and never
 *     about ground.
 *
 * The count `perCopy` scales by, the boolean `hasResource` is a comparison on,
 * and the figure `controlledHoldings` drops a kind for when it reaches nothing:
 * three questions, one subtraction, so an empire can never read as holding a
 * kind on one surface and not on another. Two empires can never hold three
 * copies between them where there were two.
 */
export function resourceCopies(
  state: GameState,
  playerId: number,
  resourceId: ResourceId,
): number {
  const owner = tileOwnerField(state);
  const tiles = state.map.tiles;
  let mine = 0;
  for (let index = 0; index < tiles.length; index++) {
    const tile = tiles[index]!;
    if (tile.resource !== resourceId) continue;
    if (owner.at(index) !== playerId) continue;
    if (openedResource(state, tile, playerId) !== null) mine += 1;
  }
  const lentAway = lentCopiesAwayBy(state, playerId)[resourceId] ?? 0;
  const lentIn = lentCopiesHeld(state, playerId)[resourceId] ?? 0;
  return Math.max(0, mine - lentAway) + lentIn;
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
  // And the tiles counted in the same sweep, because since the copies ruling a
  // kind is dropped from this list when its **net** figure reaches nothing, and
  // asking `resourceCopies` per kind would be a map sweep apiece on the
  // most-asked question in the game.
  const opened = new Map<ResourceId, number>();
  const owner = tileOwnerField(state);
  const tiles = state.map.tiles;
  for (let index = 0; index < tiles.length; index++) {
    if (owner.at(index) !== playerId) continue;
    const tile = tiles[index]!;
    const holding = openedResource(state, tile, playerId);
    if (holding === null || resourceDef(holding.id).kind !== kind) continue;
    opened.set(holding.id, (opened.get(holding.id) ?? 0) + 1);
    if (held.get(holding.id)?.via === 'improvement') continue;
    held.set(holding.id, holding);
  }
  const lentAway = lentCopiesAwayBy(state, playerId);
  const lentIn = lentCopiesHeld(state, playerId);
  // A seam another empire lent, folded in **after** the sweep and only where the
  // empire holds none of its own left: your own silk is the more specific fact,
  // the same precedence the improved reading already wins by above, and it is
  // the one a pillage or an expiry can take away separately.
  for (const lent of lentHoldings(state, playerId)) {
    if (resourceDef(lent.id).kind !== kind || held.has(lent.id)) continue;
    held.set(lent.id, lent);
  }
  return RESOURCE_IDS.filter((id) => {
    if (!held.has(id)) return false;
    // `resourceCopies`' arithmetic, off the sweep just taken: an empire that
    // lent its only amber keeps no amber to be content about, and one that lent
    // the spare of two keeps the kind. The line that survives is its own — a
    // caravan is a holding of its own only where nothing of the kind is left.
    return Math.max(0, (opened.get(id) ?? 0) - (lentAway[id] ?? 0)) + (lentIn[id] ?? 0) > 0;
  }).map((id) => held.get(id)!);
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
 *
 * **A local signature follows the empire's net holding** (flags (tt)). The
 * ground is untouched by a bargain — the tile goes on paying its yield — but the
 * *signature* is what crossed the table, and an empire that lent its only amber
 * keeps neither the contentment nor the line amber pays in the town that digs
 * it. Anything else would print the two halves of one luxury in two places and
 * let a player sell a thing they still have. Asked through `hasResource`, so the
 * town and the empire cannot disagree about what is held, and asked **only of a
 * kind this empire has actually promised away** — the gate costs nothing at all
 * in the ordinary game, where the register is empty and this walks one city's
 * ground exactly as it always did.
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
  const lentAway = lentCopiesAwayBy(state, city.ownerId);
  return RESOURCE_IDS.filter(
    (id) =>
      held.has(id) && ((lentAway[id] ?? 0) === 0 || hasResource(state, city.ownerId, id)),
  );
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
  // **What the empire is paid for having founded it** — The Charter of the
  // Marches' bounty, and the other half of the sentence `cardFoundingRider`
  // says above. That rider decides what the *town* is founded with and is read
  // by the town; this is a windfall to the *realm*, so it goes through the one
  // routine that banks one (Entry XVIII: the figure is composed once, before
  // anything is banked, and the bucket settles the instant it lands).
  //
  // Fired **last**, after the borders, the citizens and the triumphs: a rider
  // that gifts a piece places it through `realiseItem`, which wants a town that
  // is already finished. Food or hammers land in the nearest town, which for a
  // founding is this one — `settleGrowthWindfall` on whatever was touched, the
  // register of mid-turn yield mutations' entry 7 paying entry 11's way.
  if (founder) {
    const payout = windfallPayout(state, founder.id, 'found');
    for (const paid of payWindfallGrants(state, founder, payout, { col: city.col, row: city.row })) {
      settleGrowthWindfall(state, paid);
    }
    settleCultureWindfall(state, founder);
  }
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
 * A town placed *for* something scores with a sheet out of
 * `citizenFocusWeights` instead of the balanced one — either because its player
 * said so (`City.focus`, the focus pane) or because its growth is halted, a
 * settler at the front of the queue, which leans on the `production` row
 * (playtest batch two: "a city should auto-work production tiles when creating a
 * settler"). The halt is asked of `growthIsHalted`, which is asked of the row's
 * `haltsGrowth`, so nothing here compares a unit type against `"settler"` — the
 * marker is the *rule*, and the day something else stops a town growing it gets
 * the same lean for free. Which of the two speaks is `citizenLean`.
 *
 * The focus is a preference and never a way to starve a town: if the focused
 * sheet leaves the city short of what its citizens eat, the ordinary sheet is
 * used instead. That check is made against `foldCity`, the same evaluator the
 * pipeline banks with, so what it refuses is exactly the deficit `growCities`
 * would have taken a population point for.
 *
 * Avoid growth
 * ------------
 * And last, a town told to stop growing has its surplus trimmed toward zero by
 * `capFoodSurplus` — after the sheet has chosen, because the instruction is
 * about the *harvest*, not about which hex is better. It is the same refusal
 * one rung finer: the cap stops at the swap that would put the town into
 * deficit rather than abandoning the whole arrangement.
 */
export function assignCitizens(state: GameState, city: City): void {
  const balanced = CITIES.citizenWeights;
  writeAssignment(state, city, chooseCitizens(state, city, balanced));
  const lean = citizenLean(city);
  let weights = balanced;
  if (lean) {
    // The focused sheet, tried and kept only if it feeds the town. The balanced
    // assignment is already written, so `foldCity` below reads the *focused*
    // one — one call each way rather than a hypothetical, which is what keeps
    // this the same arithmetic the turn pipeline performs.
    const fallback = city.workedTiles;
    weights = CITIES.citizenFocusWeights[lean];
    writeAssignment(state, city, chooseCitizens(state, city, weights));
    if (foldCity(state, city).food < foodUpkeep(city)) {
      city.workedTiles = fallback;
      weights = balanced;
    }
  }
  if (city.avoidGrowth === true) capFoodSurplus(state, city, weights);
}

/**
 * Which sheet this town's citizens are being placed by, or `null` for the
 * balanced ordering.
 *
 * **The player's word outranks the game's guess**, which is the one precedence
 * this pane had to settle: a town told to chase gold chases gold even with a
 * settler at the front, because the halted lean is an inference about what the
 * player probably wants and `City.focus` is what they actually said. A town
 * told nothing keeps the settler lean it has had since playtest batch two.
 */
export function citizenLean(city: City): CitizenLean | null {
  const chosen = cityFocus(city);
  if (chosen !== 'default') return chosen;
  return growthIsHalted(city) ? 'production' : null;
}

/** This town's focus as a word, `'default'` when the key is absent. */
export function cityFocus(city: City): CitizenFocus {
  return city.focus ?? 'default';
}

/**
 * Which weights this city's citizens are being placed by, for a panel that wants
 * to say so.
 *
 * The *decision*, not the outcome: it says the town is chasing hammers, which is
 * what a "focus" readout means. Whether the starvation guard in `assignCitizens`
 * then put the balanced sheet back is a fact about one board, and a readout that
 * flickered between two words as a border moved would be a readout nobody could
 * read.
 */
export function citizenFocus(city: City): 'balanced' | CitizenLean {
  return citizenLean(city) ?? 'balanced';
}

/**
 * Everything that stops this seat pointing this town's people, in a sentence, or
 * `null` when nothing does.
 *
 * `dismissSpecialistError`'s shape and its promise: the panel greys the control
 * with this and the reducer refuses with it, so a disabled segment says exactly
 * what the command would have said. Three refusals and they are all about *who
 * is asking* — the town is somebody else's, the seat has finished acting
 * (`setLockedTiles`' gate: deciding where a town's people stand is an act), or
 * the town is a **puppet**, which chooses for itself until it is annexed
 * (the war ruling's queue-lock read one field over).
 */
export function citizenFocusError(
  state: GameState,
  playerId: number,
  city: City,
): string | null {
  if (city.ownerId !== playerId) return `${city.name} does not belong to you`;
  if (hasEndedTurn(state, playerId)) return `You have ended turn ${state.turn}`;
  if (city.puppet === true) return `${city.name} is a puppet and chooses for itself`;
  return null;
}

/**
 * **Avoid growth**: trims a town's food surplus toward nothing, one swapped hex
 * at a time, and stops the instant the next swap would take the citizens below
 * what they eat.
 *
 * A repair pass rather than a fourth sheet, and that is the whole design. "Work
 * hammers instead of bushels" is a *weighting* and it is what a focus already
 * says; "bank no food" is a statement about the town's **surplus**, which no
 * per-hex weight can express — a sheet that hated food would strip a town of
 * every farm it has and then be talked out of it by the starvation guard,
 * leaving the surplus exactly where it started. So the assignment is chosen
 * first, by whatever sheet is in force, and then the cheapest bushels are
 * traded away until the basket takes nothing.
 *
 * Each step swaps one worked hex for one idle hex that pays less food, choosing
 * the swap that **costs the least score** by the sheet in force — so a town
 * avoiding growth while chasing hammers gives up its grain for the best hammers
 * available, not for whatever happens to be adjacent. Ties go to the larger cut,
 * then to tile index, so the outcome is a function of the board (rule 2).
 *
 * Two things it will not do. It never moves a **pinned** hex: a lock outranks
 * the focus exactly as it outranks the score, and a player who pinned a wheat
 * field has already answered this question. And it never leaves the town in
 * deficit: the swap is written, `foldCity` is asked — the same evaluator the
 * pipeline banks with — and a harvest below `foodUpkeep` is put straight back.
 * "Where possible" is the ruling's own phrase; a town whose every hex is a farm
 * simply grows.
 *
 * It is a **trim, not a solver**: one swap at a time, and never through an
 * arrangement that starves, so a town that could have reached nothing by making
 * two swaps at once keeps the bushel neither of them could shed alone. That is
 * the ruling's "where possible" read strictly — a search that walked through
 * famine to find a better answer would be a search that could be interrupted by
 * a border move and leave the town in it.
 *
 * The cost is one `foldCity` per bushel of surplus, on the towns that opted in
 * and no others, which is the same order the halted lean has always paid.
 */
function capFoodSurplus(state: GameState, city: City, weights: CitizenWeights): void {
  const { map } = state;
  const upkeep = foodUpkeep(city);
  let food = foldCity(state, city).food;
  if (food <= upkeep) return;

  const index = (cell: { col: number; row: number }): number => tileIndex(map, cell.col, cell.row);
  const pinned = new Set(city.lockedTiles.map(index));
  const ctx = cityContext(state, city);
  // The ground is the same board on every pass — only who is standing on it
  // moves — so each hex is priced once and the loop below is arithmetic.
  const candidates = assignableTiles(state, city);
  const foodAt = new Map<number, number>();
  const scoreAt = new Map<number, number>();
  for (const tile of candidates) {
    const paid = foldTile(tile, ctx);
    foodAt.set(index(tile), paid.food);
    scoreAt.set(index(tile), yieldScore(paid, weights));
  }
  const foodOf = (tile: Tile): number => foodAt.get(index(tile)) ?? 0;
  const scoreOf = (tile: Tile): number => scoreAt.get(index(tile)) ?? 0;

  for (;;) {
    const seated = new Set(city.workedTiles.map(index));
    const out = candidates.filter((tile) => seated.has(index(tile)) && !pinned.has(index(tile)));
    const into = candidates.filter((tile) => !seated.has(index(tile)));

    let best: { out: Tile; into: Tile; cut: number; cost: number } | null = null;
    for (const leaving of out) {
      for (const arriving of into) {
        const cut = foodOf(leaving) - foodOf(arriving);
        if (cut <= 0) continue;
        const cost = scoreOf(leaving) - scoreOf(arriving);
        if (
          best === null ||
          cost < best.cost ||
          (cost === best.cost && cut > best.cut) ||
          (cost === best.cost && cut === best.cut && index(leaving) < index(best.out)) ||
          (cost === best.cost &&
            cut === best.cut &&
            index(leaving) === index(best.out) &&
            index(arriving) < index(best.into))
        ) {
          best = { out: leaving, into: arriving, cut, cost };
        }
      }
    }
    if (!best) return;

    const swap = best;
    const previous = city.workedTiles;
    const swapped = candidates.filter(
      (tile) =>
        (seated.has(index(tile)) && index(tile) !== index(swap.out)) ||
        index(tile) === index(swap.into),
    );
    writeAssignment(state, city, swapped);
    const next = foldCity(state, city).food;
    // Below what they eat, or no bushel actually left the harvest (a percentage
    // and a floor can swallow one): put the hex back and stop. The surplus that
    // remains is the surplus this trim can reach.
    if (next < upkeep || next >= food) {
      city.workedTiles = previous;
      return;
    }
    food = next;
    if (food <= upkeep) return;
  }
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
    scores.set(index(tile), yieldScore(foldTile(tile, ctx), weights));
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
 *      of the **destination's** `foldCity` (2026-08-27: the origin's buildings
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
 *      happiness reaches `foldCity` through `meterEffects`, so the town's own
 *      assignment is judged against a factor that has just moved. It costs one
 *      re-seat on a verb a player issues by hand.
 *
 *  20. **The deal verbs** (`reseatEmpire` in `diplomacy.ts`, schema 57) —
 *      `settleResearchWindfall`'s shape a third time, and for its argument
 *      exactly: a lent luxury is an empire-wide fact about what ground is worth
 *      (a signature that pays a hex, a happiness factor `meterEffects` folds
 *      into `foldCity`), and it moves *both* empires at once, so both are
 *      re-seated. Four moments reach it — a bargain signed, a peace whose terms
 *      executed, a declaration that cancelled one, and the broom that swept a
 *      lapsed one out (`settleDiplomacy`, `turn.ts`) — which is every moment a
 *      row enters or leaves `state.deals`. A future term that changes what a hex
 *      pays joins by being a term; it needs nothing new here.
 *
 *  21. **The focus verb** (`applySetCitizenFocus`, `commands.ts`) — entry 1's
 *      twin one grade coarser, and it owes the refresh for entry 1's reason
 *      exactly: pointing a town's people at hammers is a *direct* manipulation
 *      of who works what, and a pane that showed yesterday's dots until the
 *      turn ended would be showing the player that their click did nothing.
 *
 *  22. **An improvement taken out again** (`removeImprovementAt`,
 *      `improvements.ts`) — entry 4 read backwards and owed to the same panel:
 *      the hex stops paying the instant the farm comes up, and the town quoting
 *      it belongs to the player who asked for it. Entry 5's argument with the
 *      ownership turned round.
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
 *
 * **It is the seating register and nothing else** (batch E2, and this is the
 * whole of what that batch changed here). It never was a yield cache — the
 * yields a panel prints are computed on read and the one piece of derived state
 * that is *stored* is the citizen assignment — but until now the *readings* of
 * those yields were rebuilt by four surfaces on every draw, so this list read
 * like the place a stale figure would be fixed. It is not: a reading is
 * remembered on `state.revision` (`readings.ts`), a writer moves the state and
 * the revision moves with it, and every memo in the game follows without being
 * told. What is left here is the one thing a counter cannot do — a citizen who
 * should be standing somewhere else, standing somewhere else.
 *
 * One call, one city, no allocation.
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

/** One labelled percentage on what a city banks toward growth. */
export interface GrowthPercentLine {
  /** "No fresh water", "Building · Aqueduct", "Happiness" — printed verbatim. */
  source: string;
  percent: number;
}

/**
 * **Every percentage on a city's growth surplus, with its reason beside it.**
 *
 * Rule 5's list for the growth channel, and `growthSurplus` is its fold — the
 * number and its parts are one sentence, so nothing may put a percentage on the
 * basket without joining this. Until the dry-settle ruling (2026-09-03) there
 * was no list at all: the surplus summed two sources inline and the city panel
 * printed one of them, which is why an aqueduct's own +15% had never appeared on
 * the line it modifies.
 *
 * Three sources, printed from the ground up — the site, then what the town
 * built, then the mood of the empire — which is Entry XVII's direction read one
 * channel over:
 *
 *   1. **the site.** A town that cannot drink banks `cities.drySettlePercent`
 *      less until it is watered. `cityHasFreshwater` is the whole of "can it
 *      drink" (a river, a lake, an oasis, or a card that declares the fact), and
 *      `cityIsWatered` is the whole of "did it fix that" (a building whose row
 *      says it waters the town — the aqueduct). Two readings, because they are
 *      two questions: an aqueduct feeds people and no card's `freshwater` scope
 *      ever notices it.
 *   2. **the cards** — a wonder, a doctrine, a rite, and an ordinary building's
 *      own effects (`cardRulePercent` with the town in hand reaches all four).
 *   3. **the meters' stifle**, summed into one Happiness line as the panel has
 *      always printed it.
 *
 * Summed and never compounded, exactly as Entry XVII's stages are additive
 * within a stage: a −30% site and a +30% of anything have to read as nothing at
 * all, which they do not if they are multiplied one after the other.
 */
export function explainGrowthPercent(state: GameState, city: City): GrowthPercentLine[] {
  const lines: GrowthPercentLine[] = [];
  const dry = !cityHasFreshwater(state, city) && !cityIsWatered(city);
  if (dry && CITIES.drySettlePercent !== 0) {
    lines.push({ source: 'No fresh water', percent: CITIES.drySettlePercent });
  }
  for (const line of cardRulePercent(state, city.ownerId, 'growthSurplus', city)) {
    lines.push({ source: line.source, percent: line.percent });
  }
  const stifle = growthPercent(meterEffects(state, city.ownerId));
  if (stifle !== 0) lines.push({ source: 'Happiness', percent: stifle });
  return lines;
}

/** The fold of a growth-percentage list: summed, applied once. */
export function foldGrowthPercent(lines: readonly GrowthPercentLine[]): number {
  let percent = 0;
  for (const line of lines) percent += line.percent;
  return percent;
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
 *   3. every percentage on the channel throttles what is left — the dry site,
 *      the cards, the happiness stifle, folded once (`explainGrowthPercent`).
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
  yields: CityYields = foldCity(state, city),
): number {
  let surplus = yields.food - foodUpkeep(city);
  if (growthIsHalted(city)) surplus = Math.min(0, surplus);
  if (surplus <= 0) return surplus;
  // **One channel, one sum, one multiplication**, and the sum is the fold of a
  // *list* (hard rule 5) — see `explainGrowthPercent`, which the city panel
  // prints line by line. Floored at zero for `growthFactor`'s reason: the worst
  // any of this may do is stall a city, never eat it.
  const factor = Math.max(0, 1 + foldGrowthPercent(explainGrowthPercent(state, city)) / 100);
  // **Exact** since batch X. It used to floor, on the argument that "a fraction
  // of a bushel banked forever eventually decides a growth turn nobody can
  // account for" — which had it backwards: the fraction is *earned*, and a −25%
  // stifle on a surplus of 3 that floored to 2 was the empire losing a quarter
  // of a bushel a turn to arithmetic. The threshold is still a whole number and
  // the comparison is still `<`, so the growth turn is decided by a figure the
  // panel can print rather than by a rounding.
  //
  // Applied **whatever the factor is**: it used to be skipped at 1 or above,
  // which was exactly right while the meters were the only source and could only
  // ever stifle, and silently ate the first card that pushed the other way.
  return surplus * factor;
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
 *   1. the city makes its culture (`foldCity`, which has already had the
 *      happiness bonus and any authority malus applied to the *yield*);
 *   2. the writ's border factor multiplies it (`borderFactor`) — the same
 *      ±10/20% tier the meters already compute, summed-then-applied like every
 *      other percentage in this game;
 *   3. a writ in deficit freezes it outright, at any deficit at all.
 *
 * The result is **exact** (batch X): a +10% on 3 culture is 3.3, and the third
 * of a point banks like every other fraction in the game. It used to floor,
 * which meant the writ's bonus was felt only by towns already making ten culture
 * — a tuning the flooring chose rather than a designer.
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
  yields: CityYields = foldCity(state, city),
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
  // Exact since batch X — a +10% on 3 culture is 3.3 and the third of a point is
  // banked, where the old floor made the writ's bonus invisible to every town
  // making less than ten culture.
  const perTurn = base * factor;
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
 * **Where in the tree a row is priced**, which is the whole of the curve's
 * second half: `techColumn` of the technology that unlocks it (batch P1,
 * `docs/production-costs.md`).
 *
 * Read off the tree rather than stored on the row, because "when does this
 * belong" is already written down once — in `unlocks` — and a second copy on
 * the unit or the building is a second copy to forget when a designer moves a
 * node. A row the tree does **not** name says where it belongs on its own
 * (`own`): a charter's building takes the first column of its pool's age, a hull
 * that shipped ahead of its node takes the column it is waiting for.
 *
 * **The first column is the floor.** The root's column is nominal and never paid
 * (`techColumn`, `techData.ts`), so the opening kit — a warrior, a scout, a
 * worker, the settler — prices at column one along with everything else a first
 * turn can reach, rather than at a column below the table's own first step.
 *
 * A row with neither a gate nor a column of its own is a data fault, and the
 * register test says so by name; one is priced at the first column here rather
 * than crashing a build list over it.
 */
function priceColumn(gate: TechId | undefined, own: number | undefined): number {
  if (gate !== undefined) return Math.max(1, techColumn(gate));
  return Math.max(1, own ?? 1);
}

/**
 * What the column does to one price: the column it read, the factor, the line.
 *
 * The label states the **column** and the multiplier is the line's value, which
 * is the idiom the whole fold is written in — a reader is told which step of the
 * tree made a thing dear, never the designer's arithmetic.
 */
interface ColumnPrice {
  column: number;
  factor: number;
  label: string;
}

function columnPrice(column: number): ColumnPrice {
  const factor = RULES.production.columnRate ** (column - 1);
  return { column, factor, label: `Column ${column} ×${factor.toFixed(2)}` };
}

/** Where a unit is priced — its unlocking tech's column, or the row's own. */
function unitCostColumn(type: UnitTypeId): ColumnPrice {
  return columnPrice(priceColumn(UNIT_UNLOCK_TECH.get(type), unitDef(type).column));
}

/**
 * Where a building or a wonder is priced.
 *
 * `worldUnlockTech` counts as a gate: the Magnum Opus is opened by Alchemy for
 * the whole world rather than by an empire's own research, which is a different
 * *door* and the same statement about where in the tree the row belongs.
 */
function buildingCostColumn(id: BuildingId): ColumnPrice {
  const def = buildingDef(id);
  return columnPrice(
    priceColumn(BUILDING_UNLOCK_TECH.get(id) ?? def.worldUnlockTech, def.column),
  );
}

/** The words the first line of a price prints, per size. */
const BUILDING_SIZE_WORDS: Record<BuildingSize, string> = {
  small: 'Small building',
  medium: 'Medium building',
  large: 'Large building',
  wonder: 'Wonder',
  free: 'Never built',
};

/** `BUILDING_SIZE_WORDS` one roster over. */
const UNIT_SIZE_WORDS: Record<UnitSize, string> = {
  light: 'Light unit',
  line: 'Line unit',
  heavy: 'Heavy unit',
  engine: 'Engine',
  settler: 'Settler',
  free: 'Never built',
};

/**
 * **The standard itself**, as the two lines every price starts with: what size
 * of thing this is, and what the column does to it. Buildings and units share
 * it because they share the curve — one arithmetic, so a retune of either half
 * cannot move one roster and not the other.
 *
 * A row of size `free` prints one line and stops: multiplying nothing by a
 * column would put a second line on the card saying nothing happened.
 */
function sizedCostLines(word: string, base: number, price: ColumnPrice): UnitCostLine[] {
  const lines: UnitCostLine[] = [{ source: word, amount: base }];
  if (price.factor !== 1 && base > 0) {
    lines.push({ source: price.label, amount: Math.floor(base * price.factor) - base });
  }
  return lines;
}

/**
 * How many cities this empire holds, for the unique's own line below. Founding
 * order, `state.cities`, owner by id — the same reading every other sweep takes.
 */
function citiesHeldBy(state: GameState, playerId: number): number {
  let held = 0;
  for (const city of state.cities) if (city.ownerId === playerId) held += 1;
  return held;
}

/**
 * What a **once-per-empire** row costs an empire of this size, against its
 * printed price: `√(cities ÷ uniqueCostBreakeven)`.
 *
 * The ruling (2026-09-07, `docs/flags.md` item dd — "the once-per-empire
 * buildings scale in COST with the number of cities, not in effect"): a single
 * Forum paying the whole realm is worth what the realm is, so a one-city seat
 * buys it at half price and a nine-city empire at half again over. A root
 * rather than a straight share because the alternative punishes width twice —
 * the empire that has more cities to pay for it is already the one paying more
 * maintenance for them.
 *
 * A context-less asking (the Compendium, which has no empire in hand) is priced
 * at the **breakeven**, ×1: the entry then prints the row's own figure, which is
 * the honest neutral reading, and the panel a player actually buys from always
 * has a seat.
 */
function uniqueCostFactor(cities: number): number {
  const breakeven = RULES.production.uniqueCostBreakeven;
  if (!(breakeven > 0)) return 1;
  // Floored at one city: an empire with none cannot build anything, and a
  // factor of zero would print a free capstone on a star chart.
  return Math.sqrt(Math.max(1, cities) / breakeven);
}

/**
 * What one of this building — or this wonder — costs to raise, as the ordered
 * list the price is the fold of (hard rule 5, said about a price).
 *
 * Three lines, at most:
 *
 *   1. **what size of thing it is** — `sizeHammers[size]` off `data/rules.json`,
 *      printed in the size's own words ("Large building 60"). The row carries a
 *      size and never a figure (batch P1, `docs/production-costs.md`).
 *   2. **where in the tree it stands** — `columnRate ^ (column − 1)`, on the
 *      figure above it, printed as the column it read ("Column 8 ×6.62"). The
 *      column is the unlocking technology's, or the row's own where the tree
 *      does not name it.
 *   3. **the empire's size**, for a `oncePerEmpire` row only — `uniqueCostFactor`
 *      on the columned figure, after the curve and never inside it.
 *
 * **It takes a player now** (2026-09-07, item dd), and that is the reversal of a
 * statement this docblock used to make: "nothing an empire does changes what a
 * building costs to build" was true of every row until the unique's line, and
 * the day it named — "the day a card cheapens buildings this grows a third line
 * and a `playerId` in the same breath" — arrived as a cost that scales with how
 * many cities the one copy will serve. The empire is **optional**, because two
 * honest callers have none: the Compendium, which describes rows rather than a
 * game, and a caller pricing a row before it belongs to anybody. Both get the
 * breakeven reading (see `uniqueCostFactor`), and every ordinary row is
 * unaffected either way.
 *
 * Each line **floors**, exactly as the unit fold's do: a queue's cost is
 * compared against a basket in `planProduction` and printed on a button beside
 * a turn estimate, and a price with a fraction on it would be a figure no
 * surface could print honestly. Each line carries the *difference* it makes, so
 * the list still sums to the price however the roundings fall.
 */
export function explainBuildingCost(
  id: BuildingId,
  state?: GameState,
  playerId?: number,
): UnitCostLine[] {
  const def = buildingDef(id);
  const lines = sizedCostLines(
    BUILDING_SIZE_WORDS[def.size],
    RULES.production.sizeHammers[def.size] ?? 0,
    buildingCostColumn(id),
  );
  let running = foldUnitCost(lines);
  if (def.oncePerEmpire === true) {
    const cities =
      state !== undefined && playerId !== undefined
        ? citiesHeldBy(state, playerId)
        : RULES.production.uniqueCostBreakeven;
    const share = uniqueCostFactor(cities);
    if (share !== 1) {
      const scaled = Math.floor(running * share);
      lines.push({
        source: `Empire of ${Math.max(1, cities)} cities ×${share.toFixed(2)}`,
        amount: scaled - running,
      });
      running = scaled;
    }
  }
  return lines;
}

/**
 * What one of this building costs to raise. The fold of `explainBuildingCost`
 * and nothing else — `planProduction` charges it, `queueItemCost` quotes it, the
 * build list prices its rows with it and the star chart quotes an unbuilt one
 * through it, so the number on the button is the number the basket pays.
 *
 * The empire is optional for the reason `explainBuildingCost`'s docblock gives:
 * it changes a `oncePerEmpire` row's price and nothing else, and a caller with
 * no seat in hand is asking about the row rather than about a game.
 */
export function buildingProductionCost(
  id: BuildingId,
  state?: GameState,
  playerId?: number,
): number {
  return foldUnitCost(explainBuildingCost(id, state, playerId));
}

/**
 * What one unit of this type costs *this player, right now*, as the ordered
 * list the price is the fold of (hard rule 5, said about a price rather than a
 * yield).
 *
 * Four lines, in the order they apply, because the order is the arithmetic:
 *
 *   1. **what size of piece it is** — `unitSizeHammers[size]` off
 *      `data/rules.json`, in the size's own words ("Heavy unit 20"). The roster
 *      row carries a size and never a figure (batch P1).
 *   2. **where in the tree it stands** — `columnRate ^ (column − 1)`, printed as
 *      the column it read ("Column 11 ×14.88"). The buildings' own curve at the
 *      buildings' own rate: a late army costs what a late building costs, which
 *      is the reading the user marked on 2026-09-07.
 *   3. **the ladder** — `escalation` for every one of *this type* this empire
 *      has already built or bought, read off its own count in
 *      `Player.unitsBuilt` (schema 31: one ladder per escalating type, not one
 *      shared counter — a settler habit and a worker habit price separately).
 *      Presence of the field is the marker, here and in `realiseItem`: a
 *      designer who writes an escalation of zero has declared an escalating
 *      type whose ladder is currently flat, not a flat type. It climbs on the
 *      *columned* figure, which is what "the ladder stays on top of its sized
 *      figure" means: the increment is the row's own hammers either way, and
 *      putting it under the curve would have made a fourth settler dearer for
 *      standing later in a tree it does not stand in at all.
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
  const lines = unitRosterLines(type);
  let running = foldUnitCost(lines);

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

/**
 * **What the roster charges for one of these**, before any empire touches the
 * price — the first two lines of `explainUnitCost` and nothing under them.
 *
 * The two lines above the ladder are facts about the row and the tree rather
 * than about a seat, so a caller with no game in hand can honestly ask for them:
 * the Compendium describes rows, and a star chart quotes a unit an empire has
 * not unlocked. `explainBuildingCost`'s optional empire is the same bargain one
 * table over, and this is a function rather than a defaulted parameter because
 * "the roster's price" is a question worth a name.
 */
export function unitRosterLines(type: UnitTypeId): UnitCostLine[] {
  const def = unitDef(type);
  return sizedCostLines(
    UNIT_SIZE_WORDS[def.size],
    RULES.production.unitSizeHammers[def.size] ?? 0,
    unitCostColumn(type),
  );
}

/** The fold of `unitRosterLines`. */
export function unitRosterCost(type: UnitTypeId): number {
  return foldUnitCost(unitRosterLines(type));
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
 * is unknown. Units are priced by `unitProductionCost` and buildings by
 * `buildingProductionCost`; a **project** is the one flat row left, and it is
 * flat on purpose (item y, 2026-09-06: the age band prices *things*, and a
 * conversion is not one — see `ProductionRules.costAgeBand`).
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
  // The owner rides through to the building fold as well since item dd: a
  // `oncePerEmpire` row is priced against how many cities it will serve.
  return isBuildingId(item.id) ? buildingProductionCost(item.id, state, playerId) : null;
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
 * `quote` is the city's `explainCity`, for a caller asking this of many rows at
 * once — the build list asks it of every unit, every building and every queue
 * row on a single town, and the empire underneath the answer is the same every
 * time. It changes no arithmetic: the rate is still `foldCity`' production
 * for *this* item, still folded by that one function, and the quote is only the
 * half of its ingredients the item cannot change. See `CityReading` for the
 * lifetime that makes handing one in safe.
 */
export function turnsToBuild(
  state: GameState,
  city: City,
  item: QueueItem,
  index: number,
  quote?: CityReading,
): number | null {
  const cost = queueItemCost(state, city.ownerId, item);
  if (cost === null) return null;
  const banked = index === 0 ? city.hammerBasket : 0;
  // The rate *for this item*: a barracks city fills its basket faster while a
  // unit is at the front and at the plain rate otherwise, so an estimate that
  // divided by the city's unmodified production would promise a schedule the
  // basket beats. See `foldCity`'s `toward`.
  return turnsToFill(cost - banked, foldCity(state, city, [], item, quote).production);
}

/**
 * Food a city keeps out of the basket it just spent on a citizen — cotton's
 * signature, and zero for every empire without it.
 *
 * A share of the *threshold*, not of the overflow: "cities keep 10% of food upon
 * growing" is a rebate on what growing cost, so a city that grew at exactly the
 * threshold still keeps something and a city that overshot keeps the overshoot
 * *as well*. Exact since batch X: the basket carries fractions, so a tenth of a
 * threshold of 15 is a bushel and a half rather than the one the floor left.
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
  return (threshold * percent) / 100;
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
  // The population the town **grew to**, carried as a fact about the occasion:
  // First Fruits pays for the citizen that makes a town two people, and this is
  // the only moment anything knows which citizen this was (`atPopulation`).
  const payout = windfallPayout(state, player.id, 'growth', 0, 0, {
    population: city.population,
  });
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
 * The card's clause is `unitJumpsQueue` (a `rule`), and it is read **here**
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
  const cost = buildingProductionCost(id, state, city.ownerId);
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
 * **Three of the four voices settle nothing** — gold, science and faith are
 * pools that accumulate and are read where they lie. Culture is the fourth and
 * it is a *basket*: a culture pool that fills is a draft owed, so Pageants (the
 * third conversion, Code of Laws — `docs/history/tech-gifts.md` §7) ends this function
 * with `settleCultureWindfall`, which is the one wrapper that pays that debt.
 * That is the door `projectData.ts` left open, walked through rather than
 * widened: nothing here is a second path into the bucket the register in
 * CLAUDE.md exists to forbid.
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
  const culture = (pays.culture ?? 0) + (extra.culture ?? 0);
  if (culture !== 0) {
    player.culturePool += culture;
    // The basket, settled the instant it fills — see the docblock. A draft dealt
    // here reaches the same turn's `statecraft` phase, because `advanceProduction`
    // runs before it.
    settleCultureWindfall(state, player);
  }
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
  /**
   * A stamp for **this piece alone**, on top of whatever the empire's law stamps
   * on everything — The Levée en Masse's point of movement for the levy it
   * musters (`CardPeriodicMusterEffect.stamp`).
   *
   * `free`'s sibling and here for its stated reason: it cannot be derived from
   * anything this routine can see — the piece, the town and the roster are
   * identical either way — so it is a parameter. Handed straight to `createUnit`,
   * which is still the one writer of `Unit.stamp`; ignored for a building, which
   * has none.
   */
  stamp?: UnitStamp;
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
    // **The law changed under this very call** (batch E3a). A wonder is the
    // fifth source of `liveEffects`, the stones go up before the grants below
    // are asked for, and the remembered law is keyed on `GameState.revision` —
    // which a command raises when it is *finished*. So the memo is dropped here
    // rather than trusted: Stonehenge's own `pantheonSlots` line is read three
    // lines below the push that put it on the board. `forgetTheLaw`'s docblock
    // is the register of every seam that does this, and it has one entry.
    forgetTheLaw(state);
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
    payCompletionRiders(state, city, 'building', wonder !== undefined);
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
  // The caller's own stamp travels *into* the constructor rather than being
  // written on afterwards, because the health a piece is born at is read off the
  // stamp — see `createUnit`, the one writer of `Unit.stamp`. `person` is
  // undefined here: nothing calls a great person through production.
  const unit = createUnit(
    state,
    city.ownerId,
    item.id,
    item.tile.col,
    item.tile.row,
    undefined,
    options.stamp,
  );
  // The maintenance mark, and the *only* thing `options` is for. A gift is a
  // gift: a Levy's spearman and Camp Followers' stray cost their empire nothing
  // to keep, while a piece the queue paid for or the treasury bought goes on the
  // payroll like every other. That distinction cannot be derived from anything
  // this routine can see — the piece, the town and the roster are identical
  // either way — which is exactly why it is a parameter and not a rule. See
  // `Unit.freeUpkeep` for the register of who passes it.
  if (options.free) unit.freeUpkeep = true;
  // **The Throne's bargain, stamped where it is struck** (`docs/history/tech-gifts.md`
  // §7): a town holding a row that forgives its soldiers' keep
  // (`BuildingDef.unitUpkeepRebate`) sends every piece it raises out cheaper to
  // hold, for the rest of that piece's life. Read off the town's own buildings
  // here and never again, because "where was this raised" is a fact that leaves
  // the board the moment the piece marches — and read through
  // `buildingUnitUpkeepRebate` (`buildingEffects.ts`), the one reader of the
  // field, so the payroll and the bot's appraisal of the Throne cannot disagree
  // about what a town forgives (batch X8). A free piece is skipped rather than
  // stamped: it already costs nothing, and a rebate on nothing is a figure in a
  // ledger with no line to sit under. See `Unit.upkeepRebate`.
  if (!options.free) {
    let rebate = 0;
    for (const line of buildingUnitUpkeepRebate(city)) rebate += line.amount;
    if (rebate > 0) unit.upkeepRebate = rebate;
  }
  // **The mirror, stamped where the piece is made** (batch B2, `UnitDef.mirrors`).
  // A Templar is worth whatever horse this empire could raise on the day it was
  // called, so the difference between that row's figure and this row's own joins
  // the piece's stamp — an ordinary labelled line in `planCombat`'s fold, never a
  // bigger number beside the roster's name (hard rule 5). It is added to
  // whatever the law already stamped rather than replacing it: a Muster Roll and
  // a religion are two things that happened to one soldier.
  //
  // Here rather than in `createUnit`, and the reason is the module graph: this
  // file may ask `buildError` which rows an empire can raise and `state.ts` may
  // not. It costs nothing, because a mirroring row is bought or it does not
  // exist (`UnitPurchaseSpec.exclusive`) and every purchase realises here.
  const mirrored = mirrorRowFor(state, city.ownerId, item.id);
  if (mirrored !== null) {
    const lift = unitDef(mirrored).combatStrength - unitDef(item.id).combatStrength;
    if (lift !== 0) {
      unit.stamp = { ...unit.stamp, strength: (unit.stamp?.strength ?? 0) + lift };
    }
  }
  // The ladder climbs at completion, so the next one of this *same type* —
  // anywhere in the empire — is dearer from the very next resolution. Its own
  // key in `Player.unitsBuilt`, not a shared counter (schema 31). A free grant
  // does not climb it: `options.free` already marks this unit as never having
  // been paid for, and a habit nobody paid into is not a habit.
  if (unitDef(item.id).escalation !== undefined && !options.free) {
    const player = playerById(state, city.ownerId);
    if (player) player.unitsBuilt[item.id] = (player.unitsBuilt[item.id] ?? 0) + 1;
  }
  // **A keel is news** — The First Keel. Announced here, in the one routine that
  // means "the city now has the thing", so a hull hammered out, bought outright
  // or handed over by a wonder all say the same word; the Triumph's own `once`
  // scope is what makes it the first, exactly as a founding's is what makes it
  // the third city. Asked of the roster's own category, so nothing here compares
  // a type against a name.
  if (unitDef(item.id).category === 'naval') {
    awardOccasion(state, city.ownerId, 'navalUnitBuilt');
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
  return bestOfClassFor(state, playerId, 'melee');
}

/**
 * The strongest row of one **silhouette** this empire could build right now, or
 * `null`.
 *
 * `bestMeleeFor` widened by exactly one argument (batch B2), because the
 * Templars ask the same question of the horse that the Statue of Zeus asks of
 * the sword and two loops would be two opinions about which era an empire has
 * reached. `ModelClass` is the roster's own word for a line, which is the second
 * of the two deliberate exceptions to "the model class is art" — the first is
 * `UnitCombatLine.vsModelClass`.
 *
 * "Can build" is `buildError`'s question, asked whole rather than re-derived, so
 * the answer obeys the technology gate and the improved-resource gate exactly as
 * a queued row does — and a purchase-only row (the Templars themselves) is
 * refused by it, which is what keeps a mirror from measuring itself. Ties go to
 * roster order, which is the table's own order and therefore a fact a replay
 * reproduces.
 */
export function bestOfClassFor(
  state: GameState,
  playerId: number,
  modelClass: ModelClass,
): UnitTypeId | null {
  let best: UnitTypeId | null = null;
  let strength = -1;
  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    if (def.modelClass !== modelClass) continue;
    if (buildError(state, playerId, 'unit', id) !== null) continue;
    if (def.combatStrength <= strength) continue;
    strength = def.combatStrength;
    best = id;
  }
  return best;
}

/**
 * The row a mirroring row shadows **for this empire, right now** — the best
 * horse the Templars are measured against (`UnitDef.mirrors`).
 *
 * One function so that the two readings cannot disagree: the strength
 * `realiseItem` stamps and the price `explainPurchaseCost` charges are the same
 * roster answer asked twice, and a piece worth a knight that cost a horseman
 * would be a bug nobody could see in either file alone. `null` for a row that
 * mirrors nothing, and for a seat the age has taught no such row — which is what
 * makes the bank refuse the sale rather than sell one cheap.
 *
 * **The tree's gate, not `buildError`'s**, and that is the one place this parts
 * company with `bestOfClassFor`. A free spear from the Statue of Zeus is a piece
 * the empire raises, so it obeys the improved-resource gate exactly as a queued
 * one does; an *order* is not raised out of your own stables — it arrives with
 * its own horses, bought with faith — so the seams under your ground are not
 * what decides how good it is. What the age has taught you is.
 *
 * A row sold out of a bank is never the measure (`buildableMilitary`'s
 * exclusion, said again): it is what keeps a mirroring row from measuring
 * itself, since `isUnlocked` answers **true** for the Templars the moment the
 * belief that opens them is adopted.
 */
export function mirrorRowFor(
  state: GameState,
  playerId: number,
  type: UnitTypeId,
): UnitTypeId | null {
  const mirrors = unitDef(type).mirrors;
  if (mirrors === undefined) return null;
  let best: UnitTypeId | null = null;
  let strength = -1;
  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    if (def.modelClass !== mirrors.modelClass) continue;
    if (def.purchase !== undefined || def.retired === true) continue;
    // A row that **awaits a technology** the tree does not yet have (the
    // cataphract, `UnitDef.awaitsTech`) is not one the age has taught anybody:
    // `isUnlocked` cannot refuse it, because no node gates it, and without this
    // clause the mirror answered "a strength-22 cataphract" from the first turn
    // of the game (found landing batch B2, 2026-09-08). The day its node lands
    // and the marker goes, it joins the walk like any other row.
    if (def.awaitsTech === true) continue;
    if (!isUnlocked(state, playerId, 'unit', id)) continue;
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
    if (grant.grant === 'faithRung') {
      // **Through the faith ladder's own deal** (`openFreeRung`), which is the
      // seam that means "a place at the fire is being named": the hand is the
      // ordinary consecration hand, drawn from `state.rng` inside the log and
      // blocking End Turn until it is answered. The one thing the stones change
      // is that no rung is quoted, so the pick spends no faith — see
      // `CompletionGrant`. `false` covers all three refusals (a hand already
      // waiting, no place open, an empty bag) and the report does not guess
      // which, the unit arm's discipline above.
      const named = openFreeRung(state, player);
      reports.push({ grant: 'faithRung', name: 'a god', done: named });
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
  // **The world's one shared occasion** — The Bell-Founders' jealousy. A wonder
  // is the one thing in this game that is news to people who had nothing to do
  // with it (see the docblock above), so the counter it feeds is written into
  // every realm's books and not only the builder's. Here rather than in
  // `claimWonder`, which is `state.ts`' register and may not read the cards.
  recordWorldScalingOccasion(state, 'wonderAnywhere');
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
    // Exact since batch X: the basket is a fraction and so is what it buys back.
    const gold = hammers * rate;
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
 *
 * `wonder` is the one fact about *what was finished* that travels with the
 * occasion — Dinocrates' ten turns of hammers for raising a marvel. It is passed
 * rather than derived for `capturedWonder`'s stated reason one occasion over:
 * this routine is the only thing still holding the row that was realised, and a
 * moment later a wonder is one more entry in a town's `buildings` list.
 */
function payCompletionRiders(
  state: GameState,
  city: City,
  kind: 'unit' | 'building',
  wonder = false,
): void {
  const player = playerById(state, city.ownerId);
  if (!player) return;
  const at = { col: city.col, row: city.row };
  for (const occasion of ['completion', kind === 'unit' ? 'unitCompletion' : 'buildingCompletion'] as const) {
    const payout = windfallPayout(state, player.id, occasion, 0, 0, { wonder });
    // **Anything at all on the payout is paid**, not the yields alone: a rider
    // may hang a timed blessing on the realm (Dinocrates), bank renown, gift a
    // piece or heal the army, and a guard that read only `grants` dropped every
    // one of them silently. The empty case is the overwhelmingly common one —
    // most completions carry no rider — so the cheap refusal stays.
    if (
      payout.grants.length === 0 &&
      payout.timed.length === 0 &&
      payout.renown.length === 0 &&
      payout.units.length === 0 &&
      !payout.healAll
    ) {
      continue;
    }
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
  let score = yieldScore(foldTile(tile, ctx), rules.yieldWeights);

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
 *   5. **The deck** — Chartered Companies' fifteen percent off a deed, Royal
 *      Surveyors' quarter, one line each and named. Last because a charter is a
 *      fact about the empire buying rather than about the ground bought, and
 *      because a share is taken of everything above it.
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

  // **And the deck's own discount, as lines of this list** — Chartered
  // Companies' fifteen percent, Royal Surveyors' quarter. It was applied to the
  // *fold* until 2026-09-06, outside the list the docblock calls the price, so a
  // player reading four lines that added to 95 was charged 71 and nothing said
  // why. A card is a reason like a luxury is a reason, so it is a line like a
  // luxury is a line.
  //
  // The percentages **sum before one multiplication** (`foldCardRulePercent`,
  // the same rule the payroll's rebate obeys) and the one product is then shared
  // out in the cards' own order so the parts sum to it exactly. Rounded per
  // share with the remainder on the last, because a tile price is one of the
  // game's deliberate integers and a tag reading "−7.5" would be a price nobody
  // can pay. Floored at 1 for the reason the luxury's line is: free land is not
  // a discount, it is a different game.
  const charters = cardRulePercent(state, playerId, 'tilePurchase');
  const percent = foldCardRulePercent(charters);
  if (percent !== 0) {
    const before = lines.reduce((sum, line) => sum + line.amount, 0);
    const change = Math.max(1, Math.floor((before * (100 + percent)) / 100)) - before;
    let paid = 0;
    for (let i = 0; i < charters.length; i++) {
      const line = charters[i]!;
      const share =
        i === charters.length - 1 ? change - paid : Math.round((change * line.percent) / percent);
      paid += share;
      if (share === 0) continue;
      lines.push({ source: `${line.source} · ${line.percent}%`, amount: share });
    }
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
  // **The fold, and nothing beside it** (rule 5). The card discount used to be
  // applied here, to the total, on the argument that the ladder's lines are what
  // the *ground* costs and a charter is a fact about the empire buying it — but
  // a price computed beside its own breakdown is exactly what rule 5 forbids,
  // and the breakdown is what the tag prints. It is a line of the list now; see
  // `explainTilePurchase`.
  //
  // The floor is kept as a floor rather than dropped: every line that can take
  // money off already clamps to 1 on its way in, so this can only ever be the
  // fold, and it is here to say out loud that ground is never free.
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
