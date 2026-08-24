/**
 * Tile improvements: what a worker may build, what it costs them, what a worker
 * may clear away, and what a raider may tear out again.
 *
 * Pure logic over `GameState`, exactly like `cities.ts` and `combat.ts`. The two
 * commands in `commands.ts` validate with `improvementError` / `pillageError`
 * and then call the mechanism here, and the unit sheet enables its buttons with
 * the same two functions — so an offered button and an accepted command are one
 * rule, and the sentence a player reads on a refusal is the reducer's own. That
 * is `foundingError`'s bargain, kept for a second verb.
 *
 * The charge model (design ledger, M7, decided 2026-08-22)
 * -------------------------------------------------------
 * A worker is **three instant builds in a box**, not a permanent servant with a
 * task queue. `Unit.chargesLeft` counts them down, an improvement's `chargeCost`
 * says how many one build spends, and a worker that reaches zero is removed from
 * the board. Three things follow, and each is why the model was chosen:
 *
 *   · **No partial-progress tile state.** There is no half-built farm for two
 *     simultaneous turns to argue about, no "who was working on this" field, and
 *     no rule for what happens when the worker dies mid-job. One validated
 *     command per spend, resolved in log order like everything else.
 *   · **The spend is previewable.** A charge buys a *known* delta, so the
 *     panel can print "Farm +1🌾" from the same contribution machinery the turn
 *     pipeline banks with (see `improvementYieldDelta`).
 *   · **No worker-stealing annuity.** A captured worker is worth its remaining
 *     charges and nothing more, so there is no incentive to farm an opponent's
 *     labourers forever. Capture needs no rule of its own: it moves `ownerId`
 *     and `chargesLeft` rides along.
 *
 * Building spends **all** remaining movement, which is the one place this differs
 * from pillaging. Laying out a farm is the turn's work; a raid is a thing a
 * column does on its way past, so it costs a single point and the unit rides on.
 *
 * Own territory only, in v1
 * -------------------------
 * A worker may only build inside its own empire's borders. Civ V allows building
 * on unclaimed ground and Civ VI does not, and the reason to take the stricter
 * reading first is that the looser one needs a rule for what happens when the
 * ground is later claimed by somebody else — which is a rule about tile
 * ownership, and tile ownership is a city's (see `state.ts`). "Your cities' land"
 * is one lookup, it is the same lookup `hasResource` makes, and it means an
 * improvement always has an owner who can lose it.
 *
 * The same rule buys the chop its answer to a question it would otherwise have
 * to invent: hammers have to land *somewhere*, and "the city whose territory
 * holds the tile" is a city that already exists by the time the axe is legal.
 *
 * Clearing (`chopFeature`, 2026-08-23)
 * -----------------------------------
 * The worker's other verb: spend a charge, take the forest off the hex, bank a
 * one-time lump of production into the city that owns the ground. It is the
 * charge model read backwards — a *known* delta, previewable, instant, with no
 * partial-progress state — and it is gated, costed and paid entirely out of the
 * `chop` table in `data/improvements.json`, so the day the jungle is designed
 * the whole feature arrives as one JSON object. See `chopErrorAt` for the rules,
 * the resource-protection decision included.
 */

import {
  type TileYieldContext,
  refreshTileDerived,
  tileOwnerCityId,
  tileOwnerPlayerId,
  tileYieldOf,
} from './cities';
import {
  type ImprovementId,
  chopDef,
  chopYield,
  improvementDef,
  improvementForResource,
  isImprovementId,
} from './improvementData';
import { type Tile, getTileAt, tileIndex } from './map';
import { resourceDef, resourceIsVisibleTo } from './resourceData';
import { RULES } from './rulesData';
import {
  type City,
  type GameState,
  type Unit,
  cityById,
  playerById,
  removeUnit,
  unitById,
} from './state';
import { hasTech } from './tech';
import { techDef } from './techData';
import {
  TILE_YIELD_KEYS,
  type TileYield,
  emptyTileYield,
  featureDef,
} from './terrainData';
import { unitDef } from './unitData';

const IMPROVEMENTS = RULES.improvements;

// --- what a unit is ---------------------------------------------------------

/**
 * True when this unit type builds improvements at all.
 *
 * Asked of the data (`UnitDef.charges`), never of the string `"worker"` — the
 * same discipline `foundsCity` and `costIncrement` keep, so a future engineer is
 * one data row rather than a second branch in every rule.
 */
export function isBuilder(unit: Unit): boolean {
  return unitDef(unit.type).charges !== undefined;
}

/** Charges this unit has left. 0 for anything that never had any. */
export function chargesLeft(unit: Unit): number {
  return unit.chargesLeft ?? 0;
}

// --- building ---------------------------------------------------------------

/**
 * Why this tile cannot take this improvement, or `null` when it can.
 *
 * The *ground's* half of the rule, split out for the reason `foundingErrorAt` is
 * split out of `foundingError`: a lens, an AI valuation or a "where could I
 * farm?" overlay wants to ask it of a hex with no worker standing on it, and a
 * second implementation of the constraint shape would be a second implementation
 * that disagrees.
 *
 * The constraint shape is a plain AND of four optional filters, read straight
 * off the row (see `improvementData.ts`), and the messages name the filter that
 * actually refused so the player is told the one true thing rather than "you
 * cannot build that here".
 */
export function improvementErrorAt(
  state: GameState,
  ownerId: number,
  tile: Tile,
  improvementId: ImprovementId,
): string | null {
  const def = improvementDef(improvementId);
  const where = `(${tile.col}, ${tile.row})`;

  const owner = tileOwnerPlayerId(state, tile.col, tile.row);
  if (owner === null) return `${where} is not in your territory`;
  if (owner !== ownerId) return `${where} belongs to player ${owner}`;

  // A town is what a city tile has instead of an improvement. Refused here
  // rather than left to look odd on the board: the board already clears a city
  // tile's scatter, so a farm there would be furrows drawn through the streets.
  for (const city of state.cities) {
    if (city.col === tile.col && city.row === tile.row) {
      return `${city.name} stands on ${where}`;
    }
  }

  if (tile.improvement === improvementId) {
    return `${where} already has a ${def.name.toLowerCase()}`;
  }

  if (def.validTerrain !== undefined && !def.validTerrain.includes(tile.terrain)) {
    return `A ${def.name.toLowerCase()} cannot be built on ${tile.terrain}`;
  }
  if (def.validFeatures !== undefined && !def.validFeatures.includes(tile.feature)) {
    return `A ${def.name.toLowerCase()} cannot be built in ${tile.feature}`;
  }
  if (def.requiresHills !== undefined && def.requiresHills !== tile.hills) {
    return def.requiresHills
      ? `A ${def.name.toLowerCase()} needs hills`
      : `A ${def.name.toLowerCase()} needs flat ground`;
  }
  if (def.requiresResource !== undefined) {
    if (tile.resource === undefined || !def.requiresResource.includes(tile.resource)) {
      return `A ${def.name.toLowerCase()} needs a resource it can work`;
    }
  }
  // The technology **last**, after every question about the ground, which is the
  // opposite of `buildError`'s order and is the whole of what makes the worker
  // sheet readable. That sheet lists the improvements a hex could take and greys
  // only the ones the *tree* is holding back (see `improvementOptions` in
  // `controls.ts`); if the gate were asked first, a worker standing on flat
  // grassland would be told "a mine needs Mining" about a hill it is not on, and
  // the sheet would advertise six things this hex will never accept. Asked here,
  // "the only thing refusing this is the technology" is exactly
  // `improvementErrorAt(…) === improvementTechError(…)`.
  return improvementTechError(state, ownerId, improvementId);
}

/**
 * Why the *tree* refuses this improvement to this player, or `null` when it does
 * not — the one place the sentence is written.
 *
 * Split out because two callers need it separately from the ground: the last
 * clause of `improvementErrorAt` above, and the worker sheet, which asks it of
 * an improvement it is about to grey rather than hide. An improvement with no
 * `requiresTech` is never refused, which is the same escape hatch `isUnlocked`
 * keeps for a unit nothing gates.
 */
export function improvementTechError(
  state: GameState,
  ownerId: number,
  improvementId: ImprovementId,
): string | null {
  const def = improvementDef(improvementId);
  const gate = def.requiresTech;
  if (gate === undefined || hasTech(state, ownerId, gate)) return null;
  return `A ${def.name.toLowerCase()} needs ${techDef(gate).name}`;
}

/**
 * Why this unit cannot build this improvement where it stands, or `null`.
 *
 * **The** gate: the `buildImprovement` command refuses with this sentence and
 * the unit sheet lists exactly the improvements it answers `null` for, so a
 * button the panel offers is a command the reducer takes.
 *
 * The unit's own questions are asked here and the ground's are delegated to
 * `improvementErrorAt`, in that order and for `foundingError`'s reason: a
 * warrior standing on perfect farmland should be told it is a warrior, not told
 * about the farmland.
 *
 * It deliberately does *not* check who is asking or whether their turn has
 * ended. Those are questions about the actor, not about the work, and they
 * belong to the command.
 */
export function improvementError(
  state: GameState,
  unitId: number,
  improvementId: unknown,
): string | null {
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.hp <= 0) return `Unit ${unit.id} is not alive`;

  const def = unitDef(unit.type);
  if (!isBuilder(unit)) return `A ${def.name} cannot build improvements`;
  if (!isImprovementId(improvementId)) {
    return `Unknown improvement "${String(improvementId)}"`;
  }
  const cost = improvementDef(improvementId).chargeCost;
  if (chargesLeft(unit) < cost) {
    return `This ${def.name.toLowerCase()} has no charges left`;
  }
  if (unit.movesLeft <= 0) return `Unit ${unit.id} has no movement left`;

  const tile = getTileAt(state.map, unit.col, unit.row);
  if (!tile) return `Unit ${unit.id} is not on the map`;
  return improvementErrorAt(state, unit.ownerId, tile, improvementId);
}

/**
 * Lays the improvement down and charges the worker for it. Validates nothing —
 * the rules are `improvementError`'s job; this is the mechanism.
 *
 * Three mutations and each is a rule:
 *
 *   · the tile gains the improvement, **instantly**. There is no progress to
 *     bank and therefore nothing for two simultaneous seats to contend over.
 *   · the worker spends the improvement's `chargeCost`, and is *removed* when
 *     that empties it. Removal goes through `removeUnit`, so the piece leaves
 *     the board by the one path every disappearance takes and the owner's fog is
 *     refreshed without this function knowing that fog exists.
 *   · the worker spends **all** its remaining movement. Building is the turn's
 *     work; a worker that could lay a farm and then walk three hexes would be a
 *     worker that improves an empire in an afternoon.
 *
 * **The farm pays this instant.** The owning city's derived state is refreshed
 * on the spot through `refreshTileDerived` (`cities.ts`), which is the register
 * `setLockedTiles` opened: a player who has just spent a worker's charge on a
 * wheat field should see the food in the panel and in the top bar now, not after
 * they end their turn. It is done in the *mechanism* rather than in the reducer
 * so that everything which lays an improvement — the command today, an AI
 * tomorrow — gets it without having to remember, and it is asked of the ground's
 * owner rather than of the worker's, because those are not always the same
 * player and the panel that is lying belongs to the first one.
 *
 * Returns whether the worker survived, which is what the interface needs to know
 * to decide whether it still has something selected.
 */
export function buildImprovementAt(
  state: GameState,
  unit: Unit,
  tile: Tile,
  improvementId: ImprovementId,
): boolean {
  tile.improvement = improvementId;
  refreshTileDerived(state, tile);
  unit.movesLeft = 0;
  const left = chargesLeft(unit) - improvementDef(improvementId).chargeCost;
  if (left <= 0) {
    removeUnit(state, unit.id);
    return false;
  }
  unit.chargesLeft = left;
  return true;
}

/**
 * What building this improvement here would add to the tile's yield, right now.
 *
 * Entry VIII's glanceable delta, computed the only honest way `buildingYieldDelta`
 * is: the *same* evaluator is asked twice — once as the tile stands, once with
 * the candidate on it — and the difference is reported. A second implementation
 * that just read `improvementDef(id).yields` would be right today and wrong the
 * first time an improvement replaced a feature or a renewal changed the sum.
 *
 * The candidate tile is a shallow copy, so nothing is mutated and nothing is
 * cloned beyond one small object.
 */
export function improvementYieldDelta(
  tile: Tile,
  improvementId: ImprovementId,
  ctx?: TileYieldContext,
): TileYield {
  const now = tileYieldOf(tile, ctx);
  const after = tileYieldOf({ ...tile, improvement: improvementId }, ctx);
  const delta = emptyTileYield();
  for (const key of TILE_YIELD_KEYS) delta[key] = after[key] - now[key];
  return delta;
}

// --- clearing features ------------------------------------------------------

/**
 * The city whose territory holds this tile, or `null` for unclaimed ground.
 *
 * One lookup, shared by the gate, the mechanism and the worker sheet's preview,
 * so "+20⚙ → Uruk" on the button names the city the hammers actually land in.
 * Two implementations of "which city gets this" is exactly how a preview starts
 * lying.
 */
export function chopCity(state: GameState, tile: Tile): City | null {
  const cityId = tileOwnerCityId(state, tile.col, tile.row);
  if (cityId === null) return null;
  return cityById(state, cityId) ?? null;
}

/**
 * Would clearing this tile strip a resource of the ground it was placed on?
 *
 * The protection rule, and the one place it is written. Deer are placed in
 * forest, coffee in jungle, dyes in either — read off `validFeatures` in
 * `resources.json` rather than from a hand-kept list here, so the question is
 * literally "would the chop leave this resource somewhere it could never have
 * been generated". A resource that is happy on bare ground (`'none'` in its
 * list, which is most of the table) is never protected.
 */
function needsItsFeature(tile: Tile): boolean {
  if (tile.resource === undefined) return false;
  const valid = resourceDef(tile.resource).validFeatures;
  return valid !== undefined && !valid.includes('none');
}

/**
 * Why this ground cannot be cleared by this player, or `null` when it can.
 *
 * The *ground's* half, split out for `improvementErrorAt`'s reason: a lens, an
 * AI valuation or a "where are my chops?" overlay wants to ask it of a hex with
 * no worker on it, and a second implementation of the constraint would be a
 * second implementation that disagrees.
 *
 * The clauses, in the order a player thinks of them, with the technology **last**
 * for exactly the reason `improvementErrorAt` puts it last: the worker sheet's
 * Chop row is greyed with whatever this says, and "the only thing refusing this
 * is the tree" has to be a comparison the sheet can make
 * (`chopErrorAt(…) === chopTechError(…)`) rather than a fact it has to re-derive.
 *
 * **The resource-protection rule (decided 2026-08-23).** A chop is refused while
 * the tile carries a resource whose placement required the feature *and* that
 * resource is **revealed** to this player *and* the tile is **unimproved** — the
 * camp is worth more than the timber, and the game says so instead of letting a
 * player quietly delete their own deer. Both qualifiers are doing work. Revealed,
 * because a refusal that mentioned a resource the player has not researched the
 * word for would leak the map through an error message. Unimproved, because once
 * the camp stands the deer are *secured* — `openedResource` asks for the
 * improvement, never for the feature — so the timber is a legitimate second
 * harvest rather than a loss. An unrevealed seam is choppable and is simply gone,
 * which is the honest reading of "you did not know it was there".
 */
export function chopErrorAt(
  state: GameState,
  ownerId: number,
  tile: Tile,
): string | null {
  const where = `(${tile.col}, ${tile.row})`;

  const city = chopCity(state, tile);
  if (city === null) return `${where} is not in your territory`;
  if (city.ownerId !== ownerId) return `${where} belongs to player ${city.ownerId}`;

  // A town's tile keeps whatever feature it was founded in — nothing clears it,
  // and the board has already suppressed the trees under the houses. Chopping
  // there would be hammers for a picture that does not change, so it is refused
  // where every other "a town stands here" is refused.
  for (const standing of state.cities) {
    if (standing.col === tile.col && standing.row === tile.row) {
      return `${standing.name} stands on ${where}`;
    }
  }

  const def = chopDef(tile.feature);
  if (def === null) {
    return tile.feature === 'none'
      ? `There is nothing to clear on ${where}`
      : `${featureDef(tile.feature).name} cannot be cleared`;
  }

  if (needsItsFeature(tile) && tile.improvement === undefined) {
    const resource = tile.resource!;
    const player = playerById(state, ownerId);
    if (player && resourceIsVisibleTo(resource, player.techsResearched)) {
      const needed = improvementForResource(resource);
      const first = needed === null ? 'work it' : `build a ${improvementDef(needed).name.toLowerCase()}`;
      return (
        `The ${resourceDef(resource).name.toLowerCase()} here needs the ` +
        `${featureDef(tile.feature).name.toLowerCase()} — ${first} before you clear it`
      );
    }
  }

  return chopTechError(state, ownerId, tile.feature);
}

/**
 * Why the *tree* refuses to clear this feature, or `null` when it does not.
 *
 * `improvementTechError`'s sibling, and split out for the same two callers: the
 * last clause of `chopErrorAt`, and the worker sheet, which greys its Chop row
 * with the technology named rather than hiding it. A feature nothing can clear
 * answers with the ground's sentence, because "jungle needs a technology" would
 * be a promise the table does not make.
 */
export function chopTechError(
  state: GameState,
  ownerId: number,
  feature: Tile['feature'],
): string | null {
  const def = chopDef(feature);
  if (def === null) {
    return feature === 'none'
      ? 'There is nothing to clear here'
      : `${featureDef(feature).name} cannot be cleared`;
  }
  if (hasTech(state, ownerId, def.tech)) return null;
  return `Clearing ${featureDef(feature).name.toLowerCase()} needs ${techDef(def.tech).name}`;
}

/**
 * Why this unit cannot clear the feature it is standing in, or `null`.
 *
 * **The** gate: the `chopFeature` command refuses with this sentence and the
 * unit sheet enables its Chop row with it, so an offered button is a command the
 * reducer takes. The unit's own questions here and the ground's delegated, in
 * that order and for `improvementError`'s reason — a warrior standing in a
 * magnificent forest should be told it is a warrior.
 *
 * The action gating is `improvementError`'s, clause for clause: alive, a
 * builder, charges enough for the cost, and movement left to act. Chopping is
 * the same kind of work as building and it is deliberately not cheaper.
 */
export function chopError(state: GameState, unitId: number): string | null {
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.hp <= 0) return `Unit ${unit.id} is not alive`;

  const def = unitDef(unit.type);
  if (!isBuilder(unit)) return `A ${def.name} cannot clear features`;

  const tile = getTileAt(state.map, unit.col, unit.row);
  if (!tile) return `Unit ${unit.id} is not on the map`;

  // The charge cost is the *feature's*, so it has to be read before it can be
  // checked — and a hex with nothing to clear is answered by the ground rather
  // than by "no charges left", which would be a sentence about the wrong thing.
  const chop = chopDef(tile.feature);
  if (chop !== null) {
    if (chargesLeft(unit) < chop.chargeCost) {
      return `This ${def.name.toLowerCase()} has no charges left`;
    }
    if (unit.movesLeft <= 0) return `Unit ${unit.id} has no movement left`;
  }
  return chopErrorAt(state, unit.ownerId, tile);
}

/**
 * Takes the feature off the tile and banks the timber. Validates nothing — the
 * rules are `chopError`'s job; this is the mechanism.
 *
 * Four mutations, and each is the same rule `buildImprovementAt` writes:
 *
 *   · the feature goes, **instantly**, making `Tile.feature` the second field on
 *     a tile that changes during play. Yield, movement cost and defence all
 *     follow through the evaluators that already read the feature, so nothing
 *     here knows they exist — but the *stored* derived state does have to be
 *     told, so the owning city goes through `refreshTileDerived` like every
 *     other mid-turn yield mutation. A felled forest is a tile worth a different
 *     amount to a citizen standing on it, whether or not the timber it paid
 *     happens to finish something (`settleProductionWindfall`, which refreshes
 *     for its own reason and only when an item completes).
 *   · the owning city banks the production, once, into `hammerBasket` — the same
 *     pool `collectYields` pays into, so a chop simply arrives as a very good
 *     turn's work rather than as a second kind of production.
 *   · the worker spends the chop's `chargeCost` and is *removed* at zero, through
 *     `removeUnit` like every other disappearance.
 *   · the worker spends **all** its remaining movement. Felling a wood is the
 *     turn's work, exactly as laying a farm is.
 *
 * Returns whether the worker survived, which is what the interface needs in
 * order to decide whether it still has something selected.
 */
export function chopFeatureAt(state: GameState, unit: Unit, tile: Tile): boolean {
  const paid = chopYield(tile.feature);
  const cost = chopDef(tile.feature)?.chargeCost ?? 1;
  const city = chopCity(state, tile);
  if (city) city.hammerBasket += paid.production;

  tile.feature = 'none';
  refreshTileDerived(state, tile);
  unit.movesLeft = 0;
  const left = chargesLeft(unit) - cost;
  if (left <= 0) {
    removeUnit(state, unit.id);
    return false;
  }
  unit.chargesLeft = left;
  return true;
}

// --- pillaging --------------------------------------------------------------

/**
 * Why this unit cannot pillage where it stands, or `null` when it can.
 *
 * A raid is a military verb: civilians do not tear out irrigation, and the
 * question is asked of `UnitDef.category` rather than of combat strength,
 * because "does this thing fight" and "is this thing an army" are different
 * questions and stacking already answers the second one.
 *
 * "Somebody else's" is read as *not yours* rather than as "a named rival's", so
 * an improvement standing on nobody's ground — which cannot arise in play, since
 * cities are never destroyed and territory follows a capture — is still fair
 * game rather than a case with no rule.
 */
export function pillageError(state: GameState, unitId: number): string | null {
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.hp <= 0) return `Unit ${unit.id} is not alive`;

  const def = unitDef(unit.type);
  if (def.category !== 'military') return `A ${def.name} cannot pillage`;
  if (unit.movesLeft <= 0) return `Unit ${unit.id} has no movement left`;

  const tile = getTileAt(state.map, unit.col, unit.row);
  if (!tile) return `Unit ${unit.id} is not on the map`;
  if (tile.improvement === undefined) {
    return `There is nothing to pillage on (${tile.col}, ${tile.row})`;
  }

  const owner = tileOwnerPlayerId(state, tile.col, tile.row);
  if (owner === unit.ownerId) {
    return `(${tile.col}, ${tile.row}) is your own ground`;
  }
  return null;
}

/**
 * Tears the improvement out and pays the raider. Validates nothing.
 *
 * One movement point, not the whole allowance, and that is the Civ reading: a
 * column burns a farm as it rides past. It is also what makes pillaging a
 * *tempo* move rather than a turn spent — the difference between harassment and
 * a siege.
 *
 * No smoke, no ruin state, no repair verb in v1. A pillaged tile is simply an
 * unimproved tile, which means the answer to "how do I fix it?" is the answer to
 * "how did I build it?" and there is one mechanism instead of two.
 *
 * The refresh is `buildImprovementAt`'s, read from the other end and owed to the
 * other player: the raid takes the farm's food away *now*, and the panel it has
 * to stop lying to is the **victim's**. Asking the ground who to tell
 * (`refreshTileDerived`) is what gets that right without a rule of its own.
 */
export function pillageAt(state: GameState, unit: Unit, tile: Tile): void {
  delete tile.improvement;
  refreshTileDerived(state, tile);
  unit.movesLeft = Math.max(0, unit.movesLeft - 1);
  const player = playerById(state, unit.ownerId);
  if (player) player.gold += IMPROVEMENTS.pillageGold;
}

// --- queries ----------------------------------------------------------------

/**
 * The tile index of every improvement on the board, in map order.
 *
 * A pure read used by the renderer's fingerprint and by tests. In map order
 * rather than in build order, because "what is on the board" is a question about
 * the board and an order that depended on history would make two identical
 * states hash differently.
 */
export function improvedCells(state: GameState): { index: number; id: ImprovementId }[] {
  const out: { index: number; id: ImprovementId }[] = [];
  for (const tile of state.map.tiles) {
    if (tile.improvement === undefined) continue;
    out.push({ index: tileIndex(state.map, tile.col, tile.row), id: tile.improvement });
  }
  return out;
}
