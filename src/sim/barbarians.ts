/**
 * The wild: where camps appear, what comes out of them, and what it does.
 *
 * Pure logic over `GameState`, exactly like `cities.ts` and `combat.ts`. One turn
 * phase (`barbarianTurn`) is one call into this module, the camp *registry* is
 * next door in `camps.ts` (see that file for why), and every blow the wild lands
 * goes through `applyCombat` — the same evaluator a player's attack resolves
 * through, so there is no second combat implementation with the barbarians'
 * name on it.
 *
 * Nothing here is a difficulty setting. There are no probabilities: camps and
 * their bands arrive on **cadences** with hard caps beside them
 * (`rules.barbarians`), so a run of bad luck cannot bury an empire and a run of
 * good luck cannot make the wild furniture. The one die is *which* legal hex a
 * camp lands on, and it comes from `state.rng` like every other roll in the game.
 *
 * The wild inherits; it does not learn
 * ------------------------------------
 * A barbarian seat holds no technologies and `advanceResearch` skips it. What a
 * camp can field is read off the **real empires** every time it musters, through
 * `barbarianTier` — the median seat's tree. Two consequences, both intended: the
 * wild is a mirror of how far the *world* has come rather than of how far the
 * leader has, so a runaway empire does not arm its own enemies; and there is no
 * stored tier to fall out of step with the tree, because there is nothing stored
 * at all.
 *
 * It also **ignores resource gating**, and that is the one place it is not
 * playing by the rules. A swordsman needs iron and a horseman needs horses,
 * because an empire has to supply an army; the wild is not an empire and has no
 * supply — it is what is already out there. So `barbarianUnitType` reads the tier
 * for the *technology* gate and never asks `hasResource`. Said out loud here
 * because it is the kind of asymmetry that looks like a bug in six months.
 *
 * v1 is deliberately small
 * ------------------------
 * Barbarians in this version pillage improvements only by standing on them —
 * there is no razing, and **they do not capture cities**. A city they beat down
 * to 1 hit point simply stays where it is and heals (`healCities`), which is the
 * ranged-fire rule read one step further out. Capture is a real design decision
 * (what does a barbarian *do* with a town?) and it is deferred rather than
 * guessed at; the day it is made, `applyCombat`'s capture path is where it lands
 * and this paragraph is what it replaces.
 */

import { campAt, hasCampAt } from './camps';
import { applyCombat, isCombatant } from './combat';
import { type GameMap, type Tile, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from './map';
import { advanceAlongPath } from './movement';
import { canStopOn, findPath, isPassable } from './pathfind';
import { nextInt } from './rng';
import { RULES } from './rulesData';
import { chooseStartPositions } from './startPositions';
import {
  type BarbarianCamp,
  type GameState,
  type Player,
  type Unit,
  barbarianPlayer,
  createUnit,
  realPlayers,
  unitById,
} from './state';
import type { TechId } from './techData';
import { UNIT_UNLOCK_TECH } from './techData';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from './unitData';
import { hasStackingRoom } from './units';
import { VISIBLE, isVisibleTo, visibilityAt } from './visibility';

const BARB = RULES.barbarians;

// --- what the wild can field ------------------------------------------------

/**
 * The technologies the wild musters against: the **median** real empire's.
 *
 * The rule, exactly as implemented, because "median" has three defensible
 * readings and only one of them is deterministic without a tie-break argument:
 *
 *   1. take every real seat that is still in the game (`realPlayers`, minus the
 *      eliminated — an empire that is gone does not get a vote on how hard the
 *      world is);
 *   2. sort them by `(techsResearched.length, id)` ascending — the count first,
 *      the seat id as the tie-break, so two empires level on techs are ordered by
 *      a fact the state carries rather than by array luck;
 *   3. take index `floor((n − 1) / 2)`, which is the **lower** of the two middles
 *      on an even roster;
 *   4. the wild fields against *that seat's own list of technologies*, not
 *      against a count.
 *
 * Step 4 is the part worth being explicit about. A median *count* tells you how
 * many nodes the middle empire has and nothing about which, and "the strongest
 * unit unlocked by six unspecified technologies" is not a question the tech table
 * can answer. Taking the median seat's actual tree makes the rule readable in one
 * sentence — *the wild fights like the middle of the pack* — and makes it a pure
 * function of the state.
 *
 * The lower median on an even roster is the same instinct: the wild follows the
 * pack, it does not lead it. Empty for a world with no real seats left, which is
 * a state only a test can build, and `barbarianUnitType` has an answer for it.
 */
export function barbarianTier(state: GameState): readonly TechId[] {
  const roster = realPlayers(state).filter((player) => !player.eliminated);
  const contenders = roster.length > 0 ? roster : realPlayers(state);
  if (contenders.length === 0) return [];
  const sorted = [...contenders].sort(
    (a, b) => a.techsResearched.length - b.techsResearched.length || a.id - b.id,
  );
  return sorted[Math.floor((sorted.length - 1) / 2)]!.techsResearched;
}

/**
 * Is this unit type one the wild fields on foot?
 *
 * Read off `modelClass`, which is data, rather than off "has no `rangedStrength`"
 * — the two agree today and would part company the first time a `mounted` type
 * lost its bow. "Basic melee" means the footmen ladder and nothing else: not
 * archers, not siege, not cavalry (which has its own rule below), and not
 * civilians, which have no `modelClass: 'melee'` to begin with.
 */
function isBasicMelee(id: UnitTypeId): boolean {
  const def = unitDef(id);
  return def.category === 'military' && def.modelClass === 'melee';
}

/** Does this tier unlock this type? Ungated types are unlocked for everybody. */
function tierUnlocks(tier: readonly TechId[], id: UnitTypeId): boolean {
  const gate = UNIT_UNLOCK_TECH.get(id);
  return gate === undefined || tier.includes(gate);
}

/**
 * The strongest footman the median tier has reached, ignoring resource gating.
 *
 * Walked in `UNIT_TYPE_IDS` order with a strict `>` on `combatStrength`, so two
 * types of equal strength resolve to the first in the table — a fact about the
 * data file rather than about iteration luck.
 *
 * The fallback is the **weakest** melee type in the table rather than a named
 * warrior, and it is reachable only from a state with no real seats or a tier
 * holding nothing: the wild still has to put something on the board, and the
 * mildest thing the roster contains is the honest choice. Nothing in this
 * function names a unit.
 */
export function barbarianMeleeType(state: GameState): UnitTypeId | null {
  const tier = barbarianTier(state);
  const melee = UNIT_TYPE_IDS.filter(isBasicMelee);
  if (melee.length === 0) return null;

  let best: UnitTypeId | null = null;
  for (const id of melee) {
    if (!tierUnlocks(tier, id)) continue;
    if (best === null || unitDef(id).combatStrength > unitDef(best).combatStrength) best = id;
  }
  if (best !== null) return best;

  let weakest = melee[0]!;
  for (const id of melee) {
    if (unitDef(id).combatStrength < unitDef(weakest).combatStrength) weakest = id;
  }
  return weakest;
}

/** Is this camp standing in horse country? */
export function campHasHorses(state: GameState, camp: BarbarianCamp): boolean {
  const centre = getTileAt(state.map, camp.col, camp.row);
  if (!centre) return false;
  for (const tile of mapRange(state.map, tileHex(centre), BARB.horsesRadius)) {
    if (tile.resource === 'horses') return true;
  }
  return false;
}

/**
 * What this camp musters right now.
 *
 * The horse rule sits on top of the footmen ladder rather than inside it: a camp
 * within `horsesRadius` of a herd fields horsemen from `horsemanFromTurn`, and
 * the **turn gate is the tier check** for that one type. The wild does not
 * research Husbandry, so asking whether the median empire has is asking the wrong
 * question — a herd on the steppe is not waiting for anybody's permission. What
 * the gate is really for is the early game: without it, whether an empire meets
 * cavalry on turn ten would be decided by where a camp happened to land, which is
 * a coin flip rather than a difficulty. See `BarbarianRules.horsemanFromTurn`.
 *
 * A world whose roster has no horseman at all falls back to the footman, so the
 * rule survives a `units.json` that never heard of cavalry.
 */
export function barbarianUnitType(state: GameState, camp: BarbarianCamp): UnitTypeId | null {
  if (state.turn >= BARB.horsemanFromTurn && campHasHorses(state, camp)) {
    const mounted = UNIT_TYPE_IDS.find(
      (id) => unitDef(id).modelClass === 'mounted' && unitDef(id).category === 'military',
    );
    if (mounted !== undefined) return mounted;
  }
  return barbarianMeleeType(state);
}

// --- where a camp may stand -------------------------------------------------

/**
 * The start positions of this world's real roster, computed once per map.
 *
 * Memoised because `chooseStartPositions` scores every land tile on the map, and
 * the camp sweep would otherwise pay for that every few turns for an answer that
 * is meant to be the same every time.
 *
 * The cache is also what makes the answer *stable*, and that is worth being
 * precise about rather than waving at purity. Start scoring reads a **ground
 * view** of each tile — resource and improvement stripped (see
 * `startPositions.ts`) — so neither of those can move a start. It does not strip
 * `Tile.feature`, which a chop can change mid-game, so the scorer is a pure
 * function of the map *object* and the map object is not quite frozen. Memoising
 * on first use pins the answer to the board as it stood the first time a camp was
 * founded, which is the reading this rule wants anyway: where the empires
 * *began* does not change because somebody felled a wood in turn forty.
 *
 * It stays replay-exact because the first call happens at the same point in the
 * log both times — the cadence is arithmetic on the turn counter — and a replay
 * builds a fresh map object, so a live game and its replay never share an entry.
 * The `WeakMap` keying means a game that is thrown away takes its entry with it.
 */
const startCache = new WeakMap<GameMap, Map<number, Tile[]>>();

function startsFor(map: GameMap, count: number): Tile[] {
  let byCount = startCache.get(map);
  if (!byCount) {
    byCount = new Map<number, Tile[]>();
    startCache.set(map, byCount);
  }
  let starts = byCount.get(count);
  if (!starts) {
    starts = chooseStartPositions(map, count);
    byCount.set(count, starts);
  }
  return starts;
}

/**
 * May a camp be founded on this hex?
 *
 * The rule, in the order a reader would ask it. The two clauses that are *not*
 * distances are the interesting ones and are the ratified reading of "out of
 * sight" (ledger Entry XX):
 *
 *   · **not currently visible to any real empire.** Not "never explored" — that
 *     would confine camps to Terra Incognita and stop them appearing at all once
 *     the map had been walked, which is precisely when the pressure is supposed
 *     to start. Currently-visible is Civ's own rule and it means a camp can
 *     appear on remembered ground nobody is watching, which is the whole feeling:
 *     the country you stopped patrolling is the country that turns.
 *   · **outside all territory.** A camp inside somebody's borders would be a
 *     rule about tile ownership pretending to be a rule about the wild, and it is
 *     the one place a player can be sure of: your own ground stays yours.
 *
 * Then the three distances (city, start, other camps), then the plain
 * impossibilities — a hex nothing can walk to, a hex somebody is standing on, a
 * hex with a town, a camp or a ruin already on it. A ruin is excluded because a
 * camp founded on one would consume it for nobody: the wild does not claim
 * discoveries (`arrival.ts`), so the site would simply be buried.
 */
export function canFoundCampAt(state: GameState, tile: Tile, starts: readonly Tile[]): boolean {
  const { map } = state;
  if (!isPassable(tile)) return false;
  if (tile.discovery !== undefined) return false;
  if (hasCampAt(state, tile.col, tile.row)) return false;

  const index = tileIndex(map, tile.col, tile.row);
  if (state.tileOwner[index] !== null) return false;

  for (const unit of state.units) {
    if (unit.col === tile.col && unit.row === tile.row) return false;
  }
  for (const city of state.cities) {
    if (city.col === tile.col && city.row === tile.row) return false;
  }

  for (const player of realPlayers(state)) {
    if (visibilityAt(state, player.id, tile.col, tile.row) === VISIBLE) return false;
  }

  const hex = tileHex(tile);
  for (const city of state.cities) {
    const centre = getTileAt(map, city.col, city.row);
    if (!centre) continue;
    if (wrappedDistance(map, hex, tileHex(centre)) < BARB.minCampDistanceFromCity) return false;
  }
  for (const start of starts) {
    if (wrappedDistance(map, hex, tileHex(start)) < BARB.minCampDistanceFromStart) return false;
  }
  for (const camp of state.camps) {
    const at = getTileAt(map, camp.col, camp.row);
    if (!at) continue;
    if (wrappedDistance(map, hex, tileHex(at)) < BARB.minCampDistanceApart) return false;
  }
  return true;
}

/**
 * Founds up to `campsPerSpawn` camps, if this is a turn that founds any.
 *
 * The cadence is arithmetic on the turn counter rather than a die, so "a camp
 * every five turns from turn eight" is exactly what happens and a designer can
 * read the schedule off `rules.json`. The die is only ever *which* legal hex,
 * drawn uniformly from the candidates in tile-index order — so the list the roll
 * indexes into is a pure function of the board.
 *
 * The candidate list is rebuilt between camps within one sweep, because founding
 * one changes what is legal for the next (`minCampDistanceApart`). That is a
 * second full scan on the rare turn that founds two, and it is the only version
 * that cannot place a pair inside its own spacing rule.
 */
export function foundCamps(state: GameState): void {
  if (barbarianPlayer(state) === undefined) return;
  if (state.turn < BARB.firstCampTurn) return;
  if ((state.turn - BARB.firstCampTurn) % Math.max(1, BARB.campEveryTurns) !== 0) return;

  const starts = startsFor(state.map, realPlayers(state).length);
  for (let founded = 0; founded < BARB.campsPerSpawn; founded++) {
    if (state.camps.length >= BARB.maxCamps) return;
    const candidates = state.map.tiles.filter((tile) => canFoundCampAt(state, tile, starts));
    if (candidates.length === 0) return;
    const tile = candidates[nextInt(state.rng, 0, candidates.length)]!;
    state.camps.push({ col: tile.col, row: tile.row, foundedTurn: state.turn });
  }
}

// --- mustering --------------------------------------------------------------

/** Barbarian units close enough to this camp to still count as its garrison. */
function bandOf(state: GameState, camp: BarbarianCamp, wild: Player): number {
  const { map } = state;
  const centre = getTileAt(map, camp.col, camp.row);
  if (!centre) return 0;
  const hex = tileHex(centre);
  let count = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== wild.id) continue;
    const at = getTileAt(map, unit.col, unit.row);
    if (!at) continue;
    if (wrappedDistance(map, hex, tileHex(at)) <= BARB.campUnitRadius) count += 1;
  }
  return count;
}

/**
 * Where a mustered band stands: the camp itself when its category has room,
 * otherwise the first neighbour in `HEX_DIRECTIONS` order that is passable and
 * has room. `null` when the camp is boxed in.
 *
 * `spawnTileFor`'s rule in `cities.ts`, read at a camp — because it is the same
 * question, and a camp with a raider already sitting on it is exactly as common
 * as a city with a unit in it.
 */
function musterTileFor(state: GameState, camp: BarbarianCamp, type: UnitTypeId): Tile | null {
  const centre = getTileAt(state.map, camp.col, camp.row);
  if (!centre) return null;
  const { category } = unitDef(type);
  if (hasStackingRoom(state, centre.col, centre.row, category)) return centre;
  for (const tile of mapRange(state.map, tileHex(centre), 1)) {
    if (tile.col === centre.col && tile.row === centre.row) continue;
    if (!isPassable(tile)) continue;
    if (hasStackingRoom(state, tile.col, tile.row, category)) return tile;
  }
  return null;
}

/**
 * Every camp that is due musters one band, up to its cap.
 *
 * Camps are walked in `state.camps` order, which is founding order and is part of
 * the state — so two camps due on the same turn always resolve the same way.
 *
 * A camp does **not** muster on the turn it was founded (`age > 0`), which is
 * what stops a camp appearing and a raider stepping out of it in the same
 * resolution. `maxUnitsPerCamp` is counted over the band still standing *near*
 * the camp (`campUnitRadius`), not over everything the camp has ever produced:
 * a band that has marched off to besiege a town is no longer its garrison, so the
 * camp musters again. That is what makes a camp left standing a faucet rather
 * than a one-off, and it is why clearing one is worth a bounty.
 */
export function musterCamps(state: GameState): void {
  const wild = barbarianPlayer(state);
  if (!wild) return;
  const cadence = Math.max(1, BARB.unitEveryTurns);

  for (const camp of state.camps) {
    const age = state.turn - camp.foundedTurn;
    if (age <= 0 || age % cadence !== 0) continue;
    if (bandOf(state, camp, wild) >= BARB.maxUnitsPerCamp) continue;
    const type = barbarianUnitType(state, camp);
    if (type === null) continue;
    const seat = musterTileFor(state, camp, type);
    if (!seat) continue;
    createUnit(state, wild.id, type, seat.col, seat.row);
  }
}

// --- raiding ----------------------------------------------------------------

/** Something a raider would like to be standing next to. */
interface RaidTarget {
  tile: Tile;
  distance: number;
  /** Discovery order — units before cities — as the final tie-break. */
  order: number;
}

/**
 * The nearest thing this raider can see and reach for, or `null`.
 *
 * Two filters and both are the point. **Within `aggressionRadius`**, so a camp in
 * the far north does not march on a capital in the far south — barbarians are
 * local weather, not a war. And **visible to the wild**, asked through the same
 * `isVisibleTo` every other seat's fog is asked through: the wild is a player
 * with a real visibility grid (see `seatBarbarians`), so a raider walks toward
 * what it can actually see and a garrison hidden behind a ridge is hidden from it
 * exactly as it would be from an empire. That is the one place this AI is honest
 * rather than convenient, and it is the reason the wild has a grid at all.
 *
 * Ordered by `(distance, tile index, discovery order)` — a total order over
 * distinct targets, so two equally-near towns always resolve the same way.
 * Units are considered before cities, so a garrison standing outside its own
 * walls is reached for before the walls are.
 */
function nearestTarget(state: GameState, wild: Player, unit: Unit): RaidTarget | null {
  const { map } = state;
  const from = getTileAt(map, unit.col, unit.row);
  if (!from) return null;
  const hex = tileHex(from);

  const candidates: RaidTarget[] = [];
  let order = 0;
  const consider = (col: number, row: number, ownerId: number): void => {
    if (ownerId === wild.id) return;
    const tile = getTileAt(map, col, row);
    if (!tile) return;
    const distance = wrappedDistance(map, hex, tileHex(tile));
    if (distance > BARB.aggressionRadius) return;
    if (!isVisibleTo(state, wild.id, tile.col, tile.row)) return;
    candidates.push({ tile, distance, order: order++ });
  };

  for (const other of state.units) consider(other.col, other.row, other.ownerId);
  for (const city of state.cities) consider(city.col, city.row, city.ownerId);
  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) =>
      a.distance - b.distance ||
      tileIndex(map, a.tile.col, a.tile.row) - tileIndex(map, b.tile.col, b.tile.row) ||
      a.order - b.order,
  );
  return candidates[0]!;
}

/**
 * The hex a raider should march to in order to reach `goal`: the neighbour of the
 * target it can actually stand on, nearest to where it is now.
 *
 * Pathing to a *neighbour* rather than to the target itself is what lets the
 * ordinary movement machinery be reused unchanged — `findPath` refuses a goal the
 * unit could not stop on, and a tile with an enemy on it is exactly that. So the
 * raider walks to the doorstep and the attack is a separate act, which is also
 * how a player does it.
 */
function approachTile(state: GameState, unit: Unit, goal: Tile): Tile | null {
  const { map } = state;
  const from = getTileAt(map, unit.col, unit.row);
  if (!from) return null;
  const hex = tileHex(from);

  let best: Tile | null = null;
  let bestDistance = Infinity;
  let bestIndex = Infinity;
  for (const tile of mapRange(map, tileHex(goal), 1)) {
    if (tile.col === goal.col && tile.row === goal.row) continue;
    if (!canStopOn(state, unit, tile)) continue;
    const distance = wrappedDistance(map, hex, tileHex(tile));
    const index = tileIndex(map, tile.col, tile.row);
    if (distance < bestDistance || (distance === bestDistance && index < bestIndex)) {
      best = tile;
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return best;
}

/**
 * A raider with nothing to fight drifts around its camp.
 *
 * Deliberately simple, and deliberately *not* still: a band that stood on its
 * camp forever would make every camp a fortress to be stormed rather than a
 * country to be patrolled, and the fog would never move. The destination is drawn
 * from `state.rng` out of the legal hexes within `wanderRadius` of the nearest
 * camp — nearest rather than remembered, because a unit does not carry a home and
 * a camp that has been cleared should not keep commanding one.
 *
 * A raider with no camps at all — the last camp burnt out from under it — wanders
 * around itself instead, which is the honest reading of a band with nowhere to go.
 *
 * v1, and knowingly: this re-draws every turn, so an idle band jitters rather
 * than patrolling a route. It is a *deterministic* jitter and it moves the piece,
 * which is all the behaviour has to do until the wild is worth designing properly.
 */
function wander(state: GameState, unit: Unit): void {
  const { map } = state;
  const from = getTileAt(map, unit.col, unit.row);
  if (!from) return;

  let home = from;
  let bestDistance = Infinity;
  for (const camp of state.camps) {
    const tile = getTileAt(map, camp.col, camp.row);
    if (!tile) continue;
    const distance = wrappedDistance(map, tileHex(from), tileHex(tile));
    if (distance < bestDistance) {
      home = tile;
      bestDistance = distance;
    }
  }

  const options = mapRange(map, tileHex(home), BARB.wanderRadius).filter(
    (tile) =>
      !(tile.col === from.col && tile.row === from.row) && canStopOn(state, unit, tile),
  );
  if (options.length === 0) return;
  const goal = options[nextInt(state.rng, 0, options.length)]!;
  const path = findPath(state, unit, goal);
  if (path) advanceAlongPath(state, unit, path);
}

/**
 * Is the unit standing next to this tile?
 *
 * Its own tile is not adjacent to itself, which matters: a raider that has just
 * advanced onto the hex it emptied must not then be told to attack it.
 */
function isAdjacentTo(state: GameState, unit: Unit, tile: Tile): boolean {
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return false;
  return wrappedDistance(state.map, tileHex(from), tileHex(tile)) === 1;
}

/**
 * Marches and fights, one raider at a time, in the order the state carries.
 *
 * `veterans` is a snapshot taken before this turn's camps mustered, so a band
 * born this resolution does not also march in it — the same reading a city's new
 * unit gets, which is that it is born with a full allowance and spends it when
 * its owner next acts.
 *
 * Each raider, in order: find the nearest thing it can see; attack if it is
 * already adjacent; otherwise walk to the doorstep and attack if it arrived. A
 * raider with nothing in reach wanders. Every attack goes through `applyCombat`,
 * so a raid rolls the same dice, obeys the same targeting priority, takes the
 * same counter-attack and triggers the same elimination check a player's attack
 * does — and the +2 every empire gets against the wild is inside the same plan
 * (`planCombat`), which is why the forecast a player was shown is the fight the
 * raider gets.
 *
 * A unit that died earlier in this very sweep — killed by the counter-attack of
 * the raider before it — is looked up by id and skipped, which is the ordinary
 * command contract read inside a phase.
 */
export function raid(state: GameState, veterans: readonly number[]): void {
  const wild = barbarianPlayer(state);
  if (!wild) return;

  for (const id of veterans) {
    const unit = unitById(state, id);
    if (!unit || unit.ownerId !== wild.id) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    if (unit.movesLeft <= 0) continue;

    const target = nearestTarget(state, wild, unit);
    if (!target) {
      wander(state, unit);
      continue;
    }

    if (!isAdjacentTo(state, unit, target.tile)) {
      const approach = approachTile(state, unit, target.tile);
      if (approach) {
        const path = findPath(state, unit, approach);
        if (path) advanceAlongPath(state, unit, path);
      }
    }

    // Re-read: the march may have killed this unit (it cannot) or, far more
    // usefully, may have brought it into reach. `applyCombat` validates
    // everything else — range, line of sight, movement, whether the target is
    // still there — and refuses cleanly, leaving the state byte-identical.
    const after = unitById(state, unit.id);
    if (!after || after.hasAttacked || after.movesLeft <= 0) continue;
    if (!isAdjacentTo(state, after, target.tile)) continue;
    applyCombat(state, after.id, { col: target.tile.col, row: target.tile.row });
  }
}

// --- the turn phase ---------------------------------------------------------

/**
 * `barbarians`: the wild takes its turn.
 *
 * Three steps in a fixed order — found, muster, raid — and the snapshot between
 * the first two and the last is what keeps a band from marching on the turn it
 * was mustered.
 *
 * **Where this sits in `END_OF_TURN_PHASES`, and why** (the position is a rules
 * decision, like every other entry in that array): after `healCities` and
 * **before `healUnits`**.
 *
 *   · *After the cities' phases*, because a raid should be resolved against the
 *     world the turn produced — a town that grew this turn defends at its new
 *     size, and a unit that a city completed this turn is on the board to be
 *     attacked. The wild arriving before `collectYields` would be raiding last
 *     turn's map.
 *   · *Before `healUnits`*, and this is the load-bearing half. `healUnits` asks
 *     one question of every unit — "did it spend anything this turn?" — and a
 *     raider that marched or fought must answer no, exactly as a player's unit
 *     does. Put the phase after it and every barbarian in the world would heal
 *     the turn it attacked; put it after `resetMovement` and the raid would spend
 *     an allowance that had just been refilled, making a barbarian's movement
 *     free and its wounds permanent. Sitting here, the wild acts on the allowance
 *     the *previous* resolution gave it — full, because nothing else spends a
 *     barbarian's movement — and then rests, heals and refills by the same three
 *     phases everybody else does.
 *   · *Before `refreshVisibility`*, necessarily: raiders moved, so the seats that
 *     can see them changed, and that phase is the sweep that redraws every map
 *     once the world has stopped moving.
 */
export function barbarianTurn(state: GameState): void {
  const wild = barbarianPlayer(state);
  if (!wild) return;

  foundCamps(state);
  // The snapshot, by id rather than by reference: `applyCombat` removes dead
  // units from `state.units`, and a list of objects would keep corpses marching.
  const veterans = state.units.filter((unit) => unit.ownerId === wild.id).map((unit) => unit.id);
  musterCamps(state);
  raid(state, veterans);
}

/** Every camp on the board, as cells — a pure read for the renderer and tests. */
export function campCells(state: GameState): { col: number; row: number }[] {
  return state.camps.map((camp) => ({ col: camp.col, row: camp.row }));
}

/** Is there a camp here? Re-exported so callers ask the wild about the wild. */
export { campAt, hasCampAt };
