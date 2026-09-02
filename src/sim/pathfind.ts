/**
 * Movement queries over the wrapped board: A* for "how do I get there?" and
 * Dijkstra for "where can I get to?".
 *
 * Both are pure reads. They answer questions about the world as it stands; the
 * answers are executed by `movement.ts` and only ever committed by the reducer.
 *
 * Cost model
 * ----------
 * Edge cost is a property of the *destination* tile, never of the edge: entering
 * a forest costs 2 no matter which side you came from. `tileMoveCost` is the one
 * implementation, and `findPath`, `reachableTiles` and the executor all call it,
 * so a highlight can never disagree with what the move actually spends.
 *
 * It is a property of the destination *and of the mover*: a unit whose row
 * carries `ignoresTerrainCost` pays the floor for every hex it can enter at all.
 * That second term went into the evaluator rather than beside its three callers
 * for exactly the reason the first one is there — a reachable set computed by
 * one rule and walked by another is a promise the board breaks.
 *
 * And since Entry XXV it is a property of the destination, the mover *and the
 * tile the step is taken from*: a step that slides along an enemy's zone of
 * control pays the ground's price **plus `rules.movement.zocExtraCost`**. That
 * is the one thing a price cannot be asked of a lone tile, which is why
 * `stepCost` — `from`, `to`, mover, board — is now THE evaluator and
 * `tileMoveCost` is the ground's own half of it.
 *
 * The toll is the whole of the zone of control (user, 2026-08-28: "make ZOC as
 * +1"). It used to be a *lock* — the step completed and then emptied the purse
 * — which needed a turn boundary, a purse inside both searches and a clause in
 * the walk, and none of that is left: a price that is only ever a number is a
 * price four readers cannot disagree about.
 *
 * Since Entry XXVII the mover is a `MoveProfile` rather than a bare `UnitDef`,
 * because the second thing a step's price now depends on is the mover's
 * *empire*: a civilian whose owner holds the embark ability may walk onto
 * embarkable water, which is ground that is otherwise impassable to everything.
 * The rule is in `tileMoveCost` and nowhere else, so pathing, the reachable
 * highlight, the walk and the "~N turns" estimate all inherit it for free — and
 * so does everything downstream of `canTransit`, the `moveUnit` command
 * included. Combat units never embark, which is why an embarked civilian cannot
 * be reached by a melee: see the ledger entry, where that quirk is stated rather
 * than patched around.
 *
 * Since the Themes Build it is a property of the mover's *allowance* as well:
 * crossing the shore costs `rules.movement.shoreCrossing`, which as shipped is
 * everything the piece has for the turn (`MoveProfile.full`). Wading out and
 * wading ashore are the same crossing and cost the same — the rule is symmetric
 * — and it is the reason a landing is a decision rather than a detour.
 *
 * Since the trade pass it is a property of the **pair of hexes** in a second
 * way: a step whose two ends are both paved costs `roadStepCost` — a third of a
 * point — and the ground's price is *replaced* rather than discounted. That is
 * the other thing a lone tile cannot answer, and it is the reason `stepCost`
 * takes `from` at all (Entry XXV was built for roads a year before there were
 * any). Movement points are therefore exact **thirds**, and every running total
 * in this file goes through `snapMovement`; see its docblock for why a float
 * third is a bug waiting for a fourth step.
 *
 * Because every step costs a positive number — `rules.movement.minStepCost` off
 * a road, `roadStepCost` on one — there are no zero-cost edges, which is what
 * lets both searches settle a node the first time they pop it. The zone of
 * control keeps that guarantee for free now that it is a toll: `zocExtraCost` is
 * added to an already-positive price and is itself positive, so a bound step is
 * strictly dearer than the same step in open country and never cheaper than
 * nothing. The A* heuristic is scaled by `cheapestStepCost` rather than by the
 * floor, so it stays admissible over paved ground — and a toll only ever makes
 * an edge dearer, which is the direction admissibility can absorb.
 *
 * Blocking
 * --------
 * See `units.ts`: a friendly unit blocks *stopping* only, an enemy unit blocks
 * *transit* as well. So the frontier expands through friendly tiles but never
 * reports them as destinations, and `reachableTiles` never highlights a tile the
 * unit could not legally end its move on.
 *
 * Determinism
 * -----------
 * The open set is a binary heap ordered by `(f, tileIndex)` — a total order on
 * distinct nodes, so the result never depends on insertion order, heap
 * implementation details, or the order neighbours happen to come back in. Two
 * routes of exactly equal cost always resolve to the same one, which is what the
 * replay guarantee needs: the same command log must produce the same path.
 *
 * Neighbours come from `mapNeighbors`, so every step is wrap-aware and a path
 * may cross the east–west seam whenever that is shorter.
 */

import { cityAt, tileOwnerField } from './cities';
import { type GameMap, type Tile, getTile, getTileAt, mapNeighbors, tileHex, tileIndex, wrappedDistance } from './map';
import { RULES } from './rulesData';
import { cardBorderZoc } from './statecraft';
import { type GameState, type Unit, playerById } from './state';
import { techsGrant } from './techData';
import {
  type TerrainId,
  isEmbarkableTerrain,
  isOceanTerrain,
  isWaterTerrain,
  moveCost,
} from './terrainData';
import { isCoastal } from './water';
import { type UnitDef, isCivilian, isCombatant, isExplorer, isNaval, unitDef } from './unitData';
import { fullMovement, hasForeignUnit, hasStackingRoom } from './units';

/** An offset cell. The wire/serialisation form of a position. */
export interface Cell {
  col: number;
  row: number;
}

// --- exact thirds -----------------------------------------------------------

/**
 * The denominator every movement point in this game is a whole multiple of.
 *
 * Three, because a road costs a third of a point (`rules.movement.roadCostThirds`
 * over this) and nothing else in the game is fractional. It is written down once
 * so the two halves of the claim — the price of a road step, and the snapping
 * that keeps a running total exact — cannot be given different denominators.
 */
export const MOVEMENT_DENOMINATOR = 3;

/**
 * What one step **along a road** costs, in movement points. See
 * `rules.movement.roadCostThirds`.
 */
export const roadStepCost = RULES.movement.roadCostThirds / MOVEMENT_DENOMINATOR;

/**
 * The cheapest any single step can be, whatever it crosses — the floor a road
 * pushed below `minStepCost`.
 *
 * `findPath`'s heuristic multiplies this by the hexes remaining, so it must be
 * the *cheapest* edge that exists or the estimate stops being admissible and A*
 * stops being optimal. Before roads that was `minStepCost`; with roads on the
 * board a straight line of highway is cheaper per hex than the floor, and a
 * heuristic that had not noticed would quietly return second-best routes over
 * exactly the ground a player built to be fast.
 *
 * The shore crossing is folded in for the same reason and with the opposite
 * sign: as shipped it is `'all'` — the mover's whole allowance, which is never
 * below the floor — so it changes nothing here, but a game tuned to a *number*
 * could name a shore step cheaper than a road, and a minimum that had not
 * noticed would be an overestimate. Folding the setting in keeps the claim true
 * for whatever the data says rather than for the values shipped today.
 */
export const cheapestStepCost = Math.min(
  RULES.movement.minStepCost,
  roadStepCost,
  typeof RULES.movement.shoreCrossing === 'number'
    ? RULES.movement.shoreCrossing
    : Number.POSITIVE_INFINITY,
);

/**
 * Snaps a movement figure onto the exact third it must be a multiple of.
 *
 * **Why every accumulation goes through it.** A third is not representable in
 * binary, so `1/3 + 1/3 + 1/3` is `0.9999999999999999` and a column with one
 * point left would find a fourth road step it had not paid for. The integer
 * numerator *is* representable, so the arithmetic is done there and divided
 * back: every running total in this file, and the `movesLeft` the walk writes,
 * is `k / 3` for an integer `k` and two totals that mean the same number are the
 * same double.
 *
 * That last property is the one the searches lean on. `best[index]` comparisons,
 * the settle-once guarantee and the agreement between the four readers of
 * `stepCost` all rest on equal costs comparing equal — and IEEE arithmetic is
 * deterministic, so a replay reproduces it exactly on any machine.
 */
export function snapMovement(points: number): number {
  return Math.round(points * MOVEMENT_DENOMINATOR) / MOVEMENT_DENOMINATOR;
}

/**
 * Is this step taken **along a road** — both feet on paving?
 *
 * The one reading of `Tile.road`, and it asks nothing about *whose* road it is:
 * anybody walks a highway, which is Civ's rule and the honest one (an invader
 * uses your roads). The builder's seat on the field is for maintenance, and
 * maintenance alone.
 *
 * Both tiles, and that is exactly why a step's price needs `from` as well as
 * `to` (Entry XXV, built for this before roads existed): a road is a *thing
 * between two hexes*, so a caravan stepping off the highway into a forest pays
 * the forest, and one stepping onto the highway from a forest pays the forest
 * too. Half a road is no road.
 */
export function isRoadStep(from: Tile, to: Tile): boolean {
  return from.road !== undefined && to.road !== undefined;
}

/**
 * Is this step a **shore crossing** — one foot wet and one foot dry?
 *
 * `isRoadStep`'s sibling and the second rule that is a fact about the *pair* of
 * hexes rather than about either one of them, which is why it is here and not in
 * `tileMoveCost`. Symmetric on purpose: wading out and wading ashore are the
 * same crossing, so `isWaterTerrain` is asked of both ends and the step is a
 * crossing exactly when the two answers differ.
 *
 * Two movers are exempt and each for a different reason:
 *
 *   · **A ship** (`naval`). A hull entering a coastal city's hex is coming into
 *     port, and a hull leaving one is putting to sea; neither is a piece
 *     learning to swim. `tileMoveCost` already refuses it every other dry hex on
 *     the map, so this exemption cannot widen where a ship may go.
 *   · **No mover at all.** An absent profile is "the ground's own price to a
 *     land unit" (see `tileMoveCost`), and that reading has no allowance to
 *     spend — the crossing's price is a fact about the piece.
 *
 * The terrain question is `isWaterTerrain` rather than `openWater`, and
 * deliberately the wider of the two: a lake shore is a shore, and a mover that
 * cannot cross the water at all is refused by `tileMoveCost` long before a price
 * is asked for.
 */
export function isShoreStep(from: Tile, to: Tile, mover?: MoveProfile): boolean {
  if (mover === undefined || mover.naval) return false;
  return isWaterTerrain(from.terrain) !== isWaterTerrain(to.terrain);
}

/**
 * What a shore crossing costs this mover — `rules.movement.shoreCrossing`, read
 * in the one place.
 *
 * `'all'` is the mover's **whole allowance** and not a large constant, because
 * the rule is "the crossing ends your marching" and a constant would end a
 * warrior's turn while leaving a four-point column half a move to spend. Paying
 * more than the purse holds is already legal everywhere in this game — the walk
 * forgives the balance and floors at zero — so a price equal to a full refill
 * empties any purse that could still start the step, whatever is left in it.
 */
export function shoreStepCost(mover: MoveProfile): number {
  const rule = RULES.movement.shoreCrossing;
  return snapMovement(rule === 'all' ? mover.full : rule);
}

/** A tile a unit can reach this turn, with what getting there costs. */
export interface ReachableTile {
  tile: Tile;
  /** Total movement points spent walking from the unit's tile to this one. */
  cost: number;
}

/**
 * Everything about the *mover* a step's price depends on, resolved once.
 *
 * A struct rather than the bare `UnitDef` this used to be, and for `zocField`'s
 * reason exactly: both terms are facts about the whole sweep, asked per edge.
 * The row is one lookup; embarkation is a lookup *and* a question about the
 * mover's empire, which is precisely the sort of thing that must not be
 * re-derived tens of thousands of times inside one search.
 *
 * It is also where the seam is. `def` answers "what can this piece do with the
 * ground"; `embarks` answers "may this piece be on the water at all", which is a
 * fact about the unit's **owner** as much as about the unit. Keeping them in one
 * value is what lets `stepCost` stay a pure function of (map, from, to, mover,
 * field) with nothing to look up.
 */
export interface MoveProfile {
  /** The mover's row, or absent for "the ground's own price". See `tileMoveCost`. */
  def?: UnitDef;
  /**
   * True when this piece may cross **embarkable** water: a civilian whose owner
   * holds the embark ability (Sailing, today — `techsGrant` is the register).
   *
   * Civilians only — plus the explorer since 2026-08-29. It is emphatically not
   * how a *ship* is on the water: a hull does not embark, it belongs there. See
   * `naval` below and `moveProfile`.
   */
  embarks: boolean;
  /**
   * True when this piece is a **ship** (`isNaval`), which inverts the whole
   * question a step asks of the ground.
   *
   * Embarkation *widens* what a land piece may enter; this **replaces** it. A
   * hull may cross `embarkable` water — coast today, the ocean when the Astrolabe
   * opens it — and exactly one kind of dry land: `ports`. Every other hex on the
   * map is impassable to it, which is one clause in `tileMoveCost` and therefore
   * one clause the four readers of `stepCost` inherit by construction.
   */
  naval: boolean;
  /**
   * True when this mover may cross the **deep ocean** — its owner holds The
   * Astrolabe (`oceanGoing`).
   *
   * `embarks` widens what a land piece may enter and `naval` replaces the
   * question outright; this widens *which water* either of them means, which is
   * why it is a third flag and not a fourth arm. It is asked of a hull and of an
   * embarked settler alike, so the day the ocean opens it opens for both at once
   * — which is exactly what `tileMoveCost`'s docblock promised it would.
   */
  ocean: boolean;
  /**
   * What a full turn's marching is worth to this piece — `fullMovement`, the
   * allowance it refills to.
   *
   * The fourth fact about the mover a step's price depends on, and it arrived
   * with the shore crossing (the Themes Build): under
   * `rules.movement.shoreCrossing: 'all'` the price of getting one's feet wet
   * *is* the allowance, so the evaluator needs the number. Hoisted here for
   * `embarks`' reason exactly — it reads a card's stamp through `fullMovement`,
   * which is not a lookup to repeat tens of thousands of times inside a search.
   *
   * It is the **refill**, never what the piece is holding right now. A price
   * that shrank as a unit spent its points would be a price two of the four
   * readers disagree about: `reachableTiles` prices from a purse and `pathTurns`
   * prices across turn boundaries, and both must ask what the crossing *costs*
   * rather than what this piece can afford. Affordability is the walk's own
   * clause and stays there.
   */
  full: number;
  /**
   * The **land** hexes a ship may stand on at all: coastal city centres, and
   * nothing else (the user's ruling, 2026-08-29 — "a coastal city's hex is the
   * one land hex a ship may enter; it garrisons there like any unit").
   *
   * **Every** coastal town, not only this seat's, and the asymmetry that makes
   * it right is already in the movement rules: `canTransit` refuses a hex
   * holding a foreign city outright, so a hull can never *march* into somebody
   * else's harbour, while `canHoldTakenGround` — the one reading that
   * deliberately drops that clause, because the foreign town is the thing being
   * taken — lets a melee hull walk into a beaten one and capture it. That is
   * the second half of the ruling ("a naval melee unit takes a city like a land
   * melee does") and it needed no naval clause anywhere in `combat.ts`: the hex
   * is simply ground this piece can be on.
   *
   * Owner-free, therefore, and hoisted once per sweep rather than per seat.
   *
   * Held as a set of `Tile` objects rather than of indices because
   * `tileMoveCost` is a pure function of a tile and a mover and has no map to
   * take an index against — and object identity is exact here, since `getTile`
   * and `getTileAt` both hand back the very entries of `map.tiles`. It is only
   * ever asked `.has`, never iterated, so nothing about an outcome depends on
   * its order.
   *
   * Hoisted once per sweep, `zocField`'s bargain: the answer is a walk of
   * `state.cities` and asking it per edge would be that walk tens of thousands
   * of times. Its lifetime is that one sweep, for `tileOwnerField`'s reason —
   * a port set that outlived its loop would answer with a city list the state
   * has moved past.
   *
   * Absent for every mover that is not a ship, which is every mover in a game
   * with no navy in it.
   */
  ports?: ReadonlySet<Tile>;
}

/**
 * The dry hexes a ship may enter: every **coastal** city centre on the map.
 *
 * One rule, in one place, and the coastal half is `isCoastal`'s — the same test
 * `isCoastalCity` and a harbour's site ask, so a town that may build a hull is a
 * town a hull may sit in and the two cannot drift.
 *
 * Foreign towns are deliberately **in** the set, and the seat filter that used
 * to be here would have been a second answer to a question the movement rules
 * already answer better: `canTransit` refuses any hex holding somebody else's
 * city, so a hull cannot march into a stranger's harbour, and
 * `canHoldTakenGround` — which drops that clause precisely because the foreign
 * town is what is being taken — lets a melee hull walk in and capture. See
 * `MoveProfile.ports`.
 *
 * `state.cities` in array order, though the result is a set and the order cannot
 * reach an outcome — the discipline, not the requirement.
 */
export function navalPorts(state: GameState): ReadonlySet<Tile> {
  const ports = new Set<Tile>();
  for (const city of state.cities) {
    const tile = getTileAt(state.map, city.col, city.row);
    if (!tile || !isCoastal(state.map, tile)) continue;
    ports.add(tile);
  }
  return ports;
}

/**
 * The profile `unit` is moving with as things stand.
 *
 * `movePurse`'s sibling: the two things a caller has to hoist before a sweep,
 * and both are asked of the state exactly once. An owner who has vanished
 * (impossible in play, reachable from a hand-edited save) simply cannot embark,
 * which is the strictest honest answer.
 */
export function moveProfile(state: GameState, unit: Unit): MoveProfile {
  const def = unitDef(unit.type);
  const owner = playerById(state, unit.ownerId);
  // A ship is answered first and separately, because the two abilities are not
  // degrees of one thing: a hull does not embark onto the water, it is refused
  // the land. Its ports are hoisted here for the sweep, beside the embark
  // lookup, so nothing downstream asks the state a second time.
  const ocean = owner !== undefined && techsGrant(owner.techsResearched, 'oceanGoing');
  // What a whole turn is worth to this piece, asked once for the sweep: the
  // shore crossing is priced off it. `fullMovement` and not `unit.movesLeft`,
  // for the reason on the field.
  const full = fullMovement(unit, state);
  if (isNaval(def)) {
    return { def, embarks: false, naval: true, ocean, full, ports: navalPorts(state) };
  }
  // A civilian, or the explorer (user, 2026-08-29: "sailing should also allow
  // scouts to embark") — the one combat unit that may take to the water, read
  // off its row's marker rather than its name, so a later explorer inherits it.
  // Wayfinding's next step (`militaryEmbark`): a soldier may take to the water
  // too. Read as a *widening of who* rather than as a second ability to cross
  // with — `embark` is still the gate on the water itself, so an empire holding
  // the second verb without the first embarks nobody, which is the honest
  // reading of a tree where Wayfinding descends from Sailing.
  const mayEmbark =
    isCivilian(def) ||
    isExplorer(def) ||
    (owner !== undefined && techsGrant(owner.techsResearched, 'militaryEmbark'));
  const embarks =
    mayEmbark && owner !== undefined && techsGrant(owner.techsResearched, 'embark');
  return { def, embarks, naval: false, ocean, full };
}

/**
 * Movement points for `mover` to enter this tile, or `null` if it cannot be on
 * this ground at all.
 *
 * THE movement-cost evaluator, and the reason it takes a *mover* rather than
 * only a tile: `ignoresTerrainCost` (`unitData.ts`) is a rule about the price of
 * a step and embarkation is a rule about whether there is a price at all, so
 * both belong where the price is decided and nowhere else. All the readers go
 * through here — `findPath`, `reachableTiles` and `advanceAlongPath` — which is
 * what stops a highlight promising a march the walk will not deliver.
 *
 * `mover` is optional and its absence means *the ground's own price to a land
 * unit*, asked by the callers that are not about a particular piece:
 * `isPassable`, which wants only the `null`, and the interface's route estimate
 * for a unit it has not been handed.
 *
 * The two abilities are read from opposite sides of impassability, and that is
 * the whole of what each one means:
 *
 *   · **`embarks` widens.** Water has `moveCost: null`, so it is the ground the
 *     `null` came from, and an embarked civilian pays `movement.embarkCost` for
 *     the water its terrain row calls `embarkable` (coast, today). Ocean, lakes
 *     and mountains are untouched — `isEmbarkableTerrain` is a narrower question
 *     than `isWaterTerrain` on purpose.
 *   · **`ignoresTerrainCost` narrows a price that already exists**, strictly
 *     *after* impassability, so no ability makes a mountain walkable — see
 *     `UnitDef.ignoresTerrainCost`. A scout does not get the sea for free
 *     either: it embarks (the explorer is the one combat unit that may, since
 *     2026-08-29) and pays the same `embarkCost` a settler does.
 *
 * The floor is `rules.movement.minStepCost` rather than a literal 1, so the
 * ability costs whatever the game says a step costs at minimum, and the "no
 * zero-cost edges" guarantee both searches settle on holds for a scout too.
 */
/**
 * The water this mover may be on at all: what the terrain table calls
 * `embarkable` — coast — plus the **ocean**, once the mover's empire holds The
 * Astrolabe.
 *
 * One reading, asked by both arms of the water clause below, which is what keeps
 * "the ocean opened" from being two rules that could drift: a hull and an
 * embarked settler cross exactly the same sea. It is a *widening* rather than a
 * second table, so lakes and mountains stay untouched and nothing about the
 * unopened game changes by a byte.
 */
function openWater(terrain: TerrainId, mover?: MoveProfile): boolean {
  if (isEmbarkableTerrain(terrain)) return true;
  return mover?.ocean === true && isOceanTerrain(terrain);
}

export function tileMoveCost(tile: Tile, mover?: MoveProfile): number | null {
  const ground = moveCost(tile.terrain, tile.feature, tile.hills);
  if (ground === null) {
    // A ship's water is the *same* water an embarked settler crosses, and that
    // is deliberate: `isEmbarkableTerrain` is the one reading of "which sea is
    // open", so the day The Astrolabe opens the ocean it opens for both at once
    // and neither this function nor its four readers change.
    if (mover?.naval === true && openWater(tile.terrain, mover)) {
      return RULES.movement.minStepCost;
    }
    if (!mover?.embarks || !openWater(tile.terrain, mover)) return null;
    return RULES.movement.embarkCost;
  }
  // **The land half of the naval rule, and it is a refusal.** A hull pays the
  // floor to enter one of its empire's own coastal city hexes — the launch and
  // the garrison, which is the one thing a ship does ashore — and nothing at all
  // for any other dry ground, whatever the terrain table says it costs a
  // warrior. Read strictly *before* `ignoresTerrainCost`, which is a discount on
  // a price that exists and must never become a way onto a hex.
  if (mover?.naval === true) {
    return mover.ports?.has(tile) === true ? RULES.movement.minStepCost : null;
  }
  return mover?.def?.ignoresTerrainCost ? RULES.movement.minStepCost : ground;
}

/**
 * True when land units can enter the tile at all, ignoring who is standing on it.
 *
 * Deliberately **land**, and it stayed that way when embarkation landed: this is
 * what a city site, a spawn tile and a barbarian's target ask, and every one of
 * them means "is this dry ground". A city on the ocean floor and a camp on the
 * water are the two things it is here to refuse. "May *this* piece go there" is
 * `canTransit`, which takes the piece.
 */
export function isPassable(tile: Tile): boolean {
  return tileMoveCost(tile) !== null;
}

/**
 * May `unit` move *through* this tile? Ground this mover can be on, with no
 * foreign unit on it and no **foreign city** on it either. Friendly units are
 * walked past, not around; a friendly city is ground like any other.
 *
 * The city clause is what makes a town capturable at all (2026-08-28): before
 * it, nothing asked a hex "is this somebody's else's city", so a unit could
 * `moveUnit` onto an empty foreign city hex, and once it stood there the town
 * had no military slot left for anybody's attack to resolve against — a march
 * had made the place uncapturable. Taking a foreign city is capture's job
 * (`capturesCity` in `combat.ts`, an *arrival*, not a step), never an ordinary
 * march's — so this asks `cityAt` and refuses transit outright when the tile
 * holds a city that is not the mover's own. There are no alliances, so "own"
 * is the only exemption; a captured city reads as its new owner's the instant
 * `captureCity` writes it, so the winner may walk in that same turn.
 *
 * `mover` defaults to the unit's own profile so every existing caller reads the
 * same as it always did, and the two sweeps pass theirs in — the default is a
 * `playerById` per edge otherwise, which is the lookup `moveProfile` exists to
 * do once.
 */
export function canTransit(
  state: GameState,
  unit: Unit,
  tile: Tile,
  mover: MoveProfile = moveProfile(state, unit),
): boolean {
  if (tileMoveCost(tile, mover) === null) return false;
  const city = cityAt(state, tile.col, tile.row);
  if (city !== undefined && city.ownerId !== unit.ownerId) return false;
  return !hasForeignUnit(state, tile.col, tile.row, unit.ownerId);
}

/**
 * May `unit` end its move on this tile? Everything `canTransit` wants, plus room
 * under the stacking cap for the unit's own category. The unit is excluded from
 * its own count, so "may I stay here?" is always true.
 */
export function canStopOn(
  state: GameState,
  unit: Unit,
  tile: Tile,
  mover: MoveProfile = moveProfile(state, unit),
): boolean {
  if (!canTransit(state, unit, tile, mover)) return false;
  const { category } = unitDef(unit.type);
  return hasStackingRoom(state, tile.col, tile.row, category, unit.id);
}

// --- zone of control --------------------------------------------------------

/**
 * The enemy pieces whose zone of control binds one mover, resolved once.
 *
 * A field rather than a query because the rule is asked per *edge* — tens of
 * thousands of times inside one sweep — while its answer changes only when
 * somebody moves. `sources` is every hex an enemy projects from, deduplicated
 * by tile (two raiders sharing a hex are one place, and a garrison standing in
 * its own city is the same); `adjacent` is the fast reject, one byte per tile
 * index, so an edge nowhere near an enemy costs a single array read.
 */
export interface ZocField {
  /** Hexes an enemy combat unit or an enemy city projects control from. */
  readonly sources: readonly Tile[];
  /** Per tile index: 1 when at least one source stands one hex away. */
  readonly adjacent: Uint8Array;
}

/**
 * Who exerts a zone of control against `ownerId`, as of right now.
 *
 * Three clauses, and they are the whole rule:
 *
 *   - **Any other owner's** piece. There is no diplomacy yet, so foreign is
 *     hostile — the same reading `hasForeignUnit` already gives transit, and it
 *     is what makes the wild bind an empire without a barbarian special case.
 *   - **Combat units only.** A settler does not hold a line; `isCombatant` is
 *     the same predicate that decides who may be attacked and who is captured,
 *     so a civilian exerts nothing here for the reason it defends nothing there.
 *     Ranged and melee are alike: a hex within reach of an archer is a hex you
 *     do not stroll along, and `ignoresTerrainCost` is about the *ground*, so a
 *     scout is bound exactly as a swordsman is.
 *   - **Enemy cities.** A town is a garrison that cannot be killed by a march,
 *     and Civ V's rule is that it holds ground like one.
 *   - **Enemy *borders*, for a seat whose law says so** — the Great Wall, and
 *     the only card in the game that speaks to this field (`zocRule`). Every hex
 *     that empire owns projects control exactly as one of its spearmen would,
 *     which means that inside such a border **every step pays the toll**: a
 *     mover crossing it is always leaving one owned hex alongside another, so it
 *     pays `zocExtraCost` on top of the ground for every hex of the crossing.
 *     That is the intent and it is Civ V's Great Wall — a wall is not a fence,
 *     it is a country that is slow to cross.
 *
 * The clause is a *source*, and that is the whole of why it costs nothing else:
 * the toll's arithmetic (`zocBinds`, `stepCost`) and its four readers are
 * untouched, because they only ever ask this field what it projects from. It is
 * hoisted once per search like everything else here.
 *
 * The border sweep is **positional** — `state.tileOwner` by index, resolved
 * through `tileOwnerField` — for that field's stated reason: this runs inside a
 * search and asking ownership by coordinate would be a walk of `state.cities`
 * per hex of the map.
 */
export function zocField(state: GameState, ownerId: number): ZocField {
  const { map } = state;
  const sources: Tile[] = [];
  const seen = new Set<number>();
  const project = (col: number, row: number): void => {
    const tile = getTileAt(map, col, row);
    if (!tile) return;
    const index = tileIndex(map, tile.col, tile.row);
    if (seen.has(index)) return;
    seen.add(index);
    sources.push(tile);
  };

  // Arrays, never the `Set` — the sweep order is what makes two runs agree.
  for (const unit of state.units) {
    if (unit.ownerId === ownerId) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    project(unit.col, unit.row);
  }
  for (const city of state.cities) {
    if (city.ownerId === ownerId) continue;
    project(city.col, city.row);
  }
  // The Great Wall, last, so a game where nobody holds it is byte-identical to
  // the one this answered before the card existed. Asked once per *seat* rather
  // than once per hex: the walk of the map only happens for an empire whose law
  // actually says this, which in almost every game is none of them.
  const walled: number[] = [];
  for (const player of state.players) {
    if (player.id === ownerId) continue;
    if (cardBorderZoc(state, player.id)) walled.push(player.id);
  }
  if (walled.length > 0) {
    const owner = tileOwnerField(state);
    for (let index = 0; index < map.tiles.length; index++) {
      const holder = owner.at(index);
      if (holder === null || !walled.includes(holder)) continue;
      const tile = map.tiles[index]!;
      project(tile.col, tile.row);
    }
  }

  if (sources.length === 0) return { sources, adjacent: new Uint8Array(0) };
  const adjacent = new Uint8Array(map.tiles.length);
  for (const source of sources) {
    for (const hex of mapNeighbors(map, tileHex(source))) {
      const tile = getTile(map, hex);
      if (tile) adjacent[tileIndex(map, tile.col, tile.row)] = 1;
    }
  }
  return { sources, adjacent };
}

/**
 * THE zone-of-control rule: is stepping `from` → `to` a slide along a picket,
 * and therefore dearer by `rules.movement.zocExtraCost`?
 *
 * Civ V's rule exactly, and the "same piece" clause is the whole of it: leaving
 * one enemy's shadow for another's is a march, not a slide, and only a step that
 * stays alongside **the same** source is bound. So walking *into* contact is
 * free, walking *out* of it is free, and walking *around* a picket is what
 * costs — which is what makes a line of spearmen a line rather than a set of
 * six-hex tolls.
 *
 * The step still happens. This is a price, never a wall; `to` was already
 * cleared by `canTransit`, so an enemy-held hex was never on the table. What it
 * *was* until 2026-08-28 is a lock that emptied the purse, and the toll is the
 * user's ruling in its place — same predicate, ordinary arithmetic.
 */
export function zocBinds(map: GameMap, field: ZocField, from: Tile, to: Tile): boolean {
  if (field.sources.length === 0) return false;
  if (field.adjacent[tileIndex(map, from.col, from.row)] !== 1) return false;
  if (field.adjacent[tileIndex(map, to.col, to.row)] !== 1) return false;
  const fromHex = tileHex(from);
  const toHex = tileHex(to);
  for (const source of field.sources) {
    const hex = tileHex(source);
    if (wrappedDistance(map, fromHex, hex) !== 1) continue;
    if (wrappedDistance(map, toHex, hex) === 1) return true;
  }
  return false;
}

/**
 * Is this unit standing in an enemy's zone of control right now?
 *
 * The interface's question, not the searches' — it is what the unit sheet says
 * out loud so a player is not left to discover the rule by losing a turn to it.
 * A unit in contact may still march away for nothing; what it may not do is
 * sidestep along the line.
 */
export function inZoneOfControl(state: GameState, unit: Unit): boolean {
  const field = zocField(state, unit.ownerId);
  if (field.sources.length === 0) return false;
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return false;
  return field.adjacent[tileIndex(state.map, here.col, here.row)] === 1;
}

// --- the purse --------------------------------------------------------------

/**
 * What a mover may still spend before its turn ends, and what it gets back
 * after.
 *
 * Two numbers, because "how many turns is that march" is two questions: this
 * turn is short by whatever has already been spent, every later one is a full
 * allowance. `pathTurns` is the reader — the searches stopped needing a purse
 * the day the zone of control became a toll, since a toll is paid out of the
 * same purse as the ground and needs nobody to say where a turn ends.
 *
 * `refill` is `fullMovement`, so a card that pays movement pays it here too —
 * there is still exactly one place a movement allowance is decided.
 */
export interface MovePurse {
  /** Points left in the turn a walk or a search starts in. */
  left: number;
  /** The allowance every later turn refills to. Never zero — `fullMovement` floors at 1. */
  refill: number;
}

/** The purse `unit` is spending from as things stand. */
export function movePurse(state: GameState, unit: Unit): MovePurse {
  return { left: Math.max(0, unit.movesLeft), refill: fullMovement(unit, state) };
}

// --- the step evaluator -----------------------------------------------------

/** What one step off a tile costs, and why it costs that. */
export interface StepPrice {
  /**
   * Movement points this step asks, **everything included**: the destination's
   * ground (`tileMoveCost`), or `roadStepCost` when both hexes are paved, plus
   * `zocExtraCost` when the step slides along a picket. Always a whole third.
   *
   * The "everything included" is load-bearing. Nothing downstream of this
   * function may add a term of its own — the four readers subtract this number
   * from a purse and that is the whole of their arithmetic — which is what
   * stops a highlight and a march disagreeing about a toll.
   */
  cost: number;
  /**
   * True when the toll is in `cost`. Presentation only: a panel may say *why* a
   * step is dear, and nothing in the sim reads it to price anything a second
   * time.
   */
  zoc: boolean;
}

/**
 * THE step evaluator: the price of moving `from` → `to`, or `null` when nothing
 * can walk on `to` at all.
 *
 * Four readers and they must never drift: `findPath`, `reachableTiles`,
 * `advanceAlongPath` (the walk the reducer actually commits) and `pathTurns`
 * (the interface's "~N turns"). Everything about a step's price is decided here
 * — the ground, the mover's abilities, and the zone of control — so a highlight
 * cannot promise a march the walk will not deliver.
 *
 * `mover` and `field` are passed in rather than derived, because both are facts
 * about the whole sweep and re-deriving them per edge would be the same lookup
 * a few thousand times. Every caller hoists them; see `zocField` and
 * `moveProfile`.
 *
 * **The road replaces the ground's half, it does not discount it** (the trade
 * pass). A step between two paved hexes costs `roadStepCost` whatever grows on
 * the destination or however steep it is — a wooded hill on a highway is a road
 * — which is Civ's rule and the reason `Tile.road` is worth building at all. It
 * is asked strictly *after* impassability, exactly as `ignoresTerrainCost` is
 * (see `tileMoveCost`): no road makes a mountain walkable, because no road was
 * ever laid on one. The zone of control rides **on top** of whichever price
 * won, on a road or off it, and so it is the one term that is added rather than
 * substituted: a highway through a picket is a cheap step with a toll on it.
 * Rivers are untouched.
 *
 * **The shore replaces the ground too, and it outranks the road** (the Themes
 * Build). A step with one foot wet and one dry costs
 * `rules.movement.shoreCrossing` — the mover's whole allowance as shipped — so
 * embarking and landing each end the turn's marching, which is the classic rule
 * and the thing that makes a sea a sea rather than a slow field. It is priced
 * here rather than in `tileMoveCost` for the road's exact reason: it is a fact
 * about the *pair* of hexes, and pricing it here is what makes the four readers
 * agree by construction — the highlight stops at the water's edge, the "~N
 * turns" estimate counts the extra turn, and the walk spends what both of them
 * promised.
 */
export function stepCost(
  map: GameMap,
  from: Tile,
  to: Tile,
  mover: MoveProfile | undefined,
  field: ZocField,
): StepPrice | null {
  const ground = tileMoveCost(to, mover);
  if (ground === null) return null;
  // The shore is asked **before** the road, because a crossing is not a step a
  // highway can make cheap: a road runs to the water's edge and stops there, and
  // a caravan wading off the end of one is wading, not driving. (Nothing lays
  // paving on water, so the two can only ever meet on the dry half of the step.)
  // Like the road, it *replaces* the ground's price rather than discounting it.
  let base = isRoadStep(from, to) ? roadStepCost : ground;
  if (mover !== undefined && isShoreStep(from, to, mover)) base = shoreStepCost(mover);
  const zoc = zocBinds(map, field, from, to);
  // Snapped for `snapMovement`'s reason: the base may be a road's third and the
  // toll is a whole point, and a sum of the two has to compare equal to itself
  // in the searches' `best` arrays.
  return { cost: zoc ? snapMovement(base + RULES.movement.zocExtraCost) : base, zoc };
}

/**
 * The running total after paying `price` from a total of `spent`.
 *
 * One line, and it is kept as a function anyway: it is the seam the two
 * searches share with the walk, and it was where the zone of control's own
 * arithmetic used to live. A fifth reader that grows a running total of its own
 * adds it here or the four stop agreeing.
 */
export function stepArrival(spent: number, price: StepPrice): number {
  return snapMovement(spent + price.cost);
}

/**
 * How many more turns of marching `path` costs `unit`, as an estimate.
 *
 * The fourth reader of `stepCost`, and it lives here rather than in the panel
 * that prints it for the reason the other three are here: an estimate quoted by
 * arithmetic of its own is an estimate that disagrees with the march the turn
 * change will walk — and the zone of control is exactly the sort of rule a
 * hand-rolled copy would have missed.
 *
 * An estimate rather than a promise (hence the `~` where it is printed): the
 * board can change under a stored order, and the reducer re-decides all of it at
 * the time. An impassable waypoint stops the count rather than inventing a
 * number — that order is about to be abandoned, not about to take forever.
 *
 * The answer is *turn changes until arrival*, so it is never zero: a standing
 * order is resolved at the turn change and not before, and a column that gets
 * there on this turn's remaining points is still one turn away. Each refill it
 * needs on top of that is one more — which is where a zone of control shows up
 * in a number a player can read, since a march that pays a toll at every hex
 * runs the purse down sooner and asks for a refill it would not have needed.
 *
 * `purse` defaults to what the unit is actually holding, which is the reading
 * every interface wants ("~N turns from now"). One caller passes a **full** one:
 * a trade route's range (`routeStartable` in `trade.ts`) is a fact about the
 * distance between two cities and must not shorten because the caravan walked
 * into town before it was sent. It is the same arithmetic either way, which is
 * the whole reason the purse is a parameter rather than a second loop.
 */
export function pathTurns(
  state: GameState,
  unit: Unit,
  path: readonly Cell[],
  purse: MovePurse = movePurse(state, unit),
): number {
  const { map } = state;
  const mover = moveProfile(state, unit);
  const field = zocField(state, unit.ownerId);
  let from = getTileAt(map, unit.col, unit.row);
  let turns = 0;
  let budget = purse.left;
  for (const cell of path) {
    if (budget <= 0) {
      turns += 1;
      budget = purse.refill;
    }
    const to = getTileAt(map, cell.col, cell.row);
    if (!from || !to) break;
    const price = stepCost(map, from, to, mover, field);
    if (price === null) break;
    budget = Math.max(0, snapMovement(budget - price.cost));
    from = to;
  }
  return turns + 1;
}

// --- open set ---------------------------------------------------------------

/**
 * Binary min-heap keyed by `(priority, index)`.
 *
 * The tile index is part of the key, not a tiebreak bolted on afterwards, which
 * makes the ordering a total order over distinct tiles and the search's output a
 * pure function of its input. See the module docblock.
 */
class TileHeap {
  private readonly priorities: number[] = [];
  private readonly indices: number[] = [];

  get size(): number {
    return this.indices.length;
  }

  private less(a: number, b: number): boolean {
    const pa = this.priorities[a]!;
    const pb = this.priorities[b]!;
    if (pa !== pb) return pa < pb;
    return this.indices[a]! < this.indices[b]!;
  }

  private swap(a: number, b: number): void {
    const p = this.priorities[a]!;
    this.priorities[a] = this.priorities[b]!;
    this.priorities[b] = p;
    const i = this.indices[a]!;
    this.indices[a] = this.indices[b]!;
    this.indices[b] = i;
  }

  push(index: number, priority: number): void {
    this.priorities.push(priority);
    this.indices.push(index);
    let child = this.indices.length - 1;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (!this.less(child, parent)) break;
      this.swap(child, parent);
      child = parent;
    }
  }

  pop(): number {
    const top = this.indices[0]!;
    const lastPriority = this.priorities.pop()!;
    const lastIndex = this.indices.pop()!;
    if (this.indices.length > 0) {
      this.priorities[0] = lastPriority;
      this.indices[0] = lastIndex;
      let parent = 0;
      for (;;) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;
        if (left < this.indices.length && this.less(left, smallest)) smallest = left;
        if (right < this.indices.length && this.less(right, smallest)) smallest = right;
        if (smallest === parent) break;
        this.swap(parent, smallest);
        parent = smallest;
      }
    }
    return top;
  }
}

// --- A* ---------------------------------------------------------------------

/** Every neighbour tile of `tile`, wrap-aware, in `HEX_DIRECTIONS` order. */
function neighborsOf(map: GameMap, tile: Tile): Tile[] {
  const result: Tile[] = [];
  for (const hex of mapNeighbors(map, tileHex(tile))) {
    const neighbor = getTile(map, hex);
    if (neighbor) result.push(neighbor);
  }
  return result;
}

/**
 * The cheapest route from `unit`'s tile to `goal`, as the offset cells to step
 * onto in order — the start tile is *not* included, the goal always is.
 *
 * Returns `null` when no route exists, when the goal is where the unit already
 * stands, or when the goal is not somewhere the unit could legally stop.
 *
 * `mover` defaults to the unit's own profile, exactly as `canTransit` and
 * `canStopOn` next door default theirs, and for the third time it is the same
 * bargain: the profile is a fact about the *whole search* and asking the tables
 * per neighbour would be the same lookup a few thousand times. Passing one
 * explicitly asks a different question — "what route would a mover **like this**
 * take from here" — and there is exactly one caller that wants it:
 * `layFoundingRoad` (`cities.ts`) surveys with `embarks: false`, because The
 * Founders' Road builds a road and a road does not cross water even where the
 * empire's caravans could swim it. An override that widened what the mover may
 * do would be a way to path a piece somewhere it cannot go; narrowing is safe by
 * construction, and nothing in the simulation widens.
 *
 * The heuristic is `wrappedDistance × minStepCost`: at most one step's minimum
 * cost per remaining hex, therefore never an overestimate, therefore optimal.
 */
export function findPath(
  state: GameState,
  unit: Unit,
  goal: Tile,
  mover: MoveProfile = moveProfile(state, unit),
): Cell[] | null {
  const { map } = state;
  const start = getTileAt(map, unit.col, unit.row);
  if (!start) return null;

  const startIndex = tileIndex(map, start.col, start.row);
  const goalIndex = tileIndex(map, goal.col, goal.row);
  if (startIndex === goalIndex) return null;

  const goalHex = tileHex(goal);
  if (!canStopOn(state, unit, goal, mover)) return null;
  // The other fact about the whole search, hoisted for `mover`'s reason: who
  // holds ground against it. See `stepCost`.
  const field = zocField(state, unit.ownerId);
  // `cheapestStepCost`, not `minStepCost`: a road is cheaper than the floor, so
  // an estimate built on the floor would overestimate a highway and A* would
  // stop returning the cheapest route over exactly the ground a player paved.
  const heuristic = (tile: Tile): number =>
    wrappedDistance(map, tileHex(tile), goalHex) * cheapestStepCost;

  const count = map.tiles.length;
  const best = new Float64Array(count).fill(Infinity);
  const cameFrom = new Int32Array(count).fill(-1);
  const settled = new Uint8Array(count);

  best[startIndex] = 0;
  const open = new TileHeap();
  open.push(startIndex, heuristic(start));

  while (open.size > 0) {
    const current = open.pop();
    if (settled[current] === 1) continue;
    settled[current] = 1;
    if (current === goalIndex) break;

    const tile = map.tiles[current]!;
    for (const neighbor of neighborsOf(map, tile)) {
      const index = tileIndex(map, neighbor.col, neighbor.row);
      if (settled[index] === 1) continue;
      // Transit is all an intermediate tile needs, so a path may thread between
      // friendly units. The goal was already checked with the stricter
      // `canStopOn`, which implies this.
      if (!canTransit(state, unit, neighbor, mover)) continue;
      const price = stepCost(map, tile, neighbor, mover, field);
      if (price === null) continue;

      // Every edge is strictly positive — the ground's price, and a toll on top
      // of it where a picket binds the step — so the heuristic stays admissible
      // and a node still settles the first time it is popped.
      const candidate = stepArrival(best[current]!, price);
      if (candidate >= best[index]!) continue;
      best[index] = candidate;
      cameFrom[index] = current;
      open.push(index, candidate + heuristic(neighbor));
    }
  }

  if (settled[goalIndex] !== 1) return null;

  const reversed: Cell[] = [];
  for (let at = goalIndex; at !== startIndex; at = cameFrom[at]!) {
    const tile = map.tiles[at]!;
    reversed.push({ col: tile.col, row: tile.row });
  }
  reversed.reverse();
  return reversed;
}

// --- reachability -----------------------------------------------------------

/**
 * Every tile `unit` could legally end this turn on, with the cost of getting
 * there. Ordered by tile index so the result is stable.
 *
 * The frontier stops expanding at a node once the unit would arrive there with
 * no movement left, but such a node is still *reported*: entering a tile always
 * succeeds while any movement remains, even when the tile costs more than that
 * (see `movement.ts`). That is exactly what the executor does, so the highlight
 * and the move can never disagree.
 *
 * A zone-of-control toll rides that same clause and needs no clause of its own.
 * It is a strictly positive addition to an ordinary price, so a bound step is
 * reported when the mover can start it and the frontier stops behind it exactly
 * where the purse runs out — the rule drawn on the board rather than explained
 * in a tooltip, and by the same arithmetic a forest is.
 */
export function reachableTiles(state: GameState, unit: Unit): ReachableTile[] {
  const { map } = state;
  const results: ReachableTile[] = [];
  const start = getTileAt(map, unit.col, unit.row);
  if (!start || unit.movesLeft <= 0) return results;

  const budget = unit.movesLeft;
  // `findPath`'s reason: one table lookup for the whole sweep, and the same
  // profile the executor will spend the points with.
  const mover = moveProfile(state, unit);
  const field = zocField(state, unit.ownerId);
  const count = map.tiles.length;
  const best = new Float64Array(count).fill(Infinity);
  const settled = new Uint8Array(count);
  const startIndex = tileIndex(map, start.col, start.row);

  best[startIndex] = 0;
  const open = new TileHeap();
  open.push(startIndex, 0);

  while (open.size > 0) {
    const current = open.pop();
    if (settled[current] === 1) continue;
    settled[current] = 1;

    const cost = best[current]!;
    if (current !== startIndex) {
      const tile = map.tiles[current]!;
      if (canStopOn(state, unit, tile, mover)) results.push({ tile, cost });
    }
    // Arriving with nothing left ends the move: no step can follow.
    if (cost >= budget) continue;

    const tile = map.tiles[current]!;
    for (const neighbor of neighborsOf(map, tile)) {
      const index = tileIndex(map, neighbor.col, neighbor.row);
      if (settled[index] === 1) continue;
      if (!canTransit(state, unit, neighbor, mover)) continue;
      const price = stepCost(map, tile, neighbor, mover, field);
      if (price === null) continue;

      const candidate = stepArrival(cost, price);
      if (candidate >= best[index]!) continue;
      best[index] = candidate;
      open.push(index, candidate);
    }
  }

  results.sort((a, b) => tileIndex(map, a.tile.col, a.tile.row) - tileIndex(map, b.tile.col, b.tile.row));
  return results;
}
