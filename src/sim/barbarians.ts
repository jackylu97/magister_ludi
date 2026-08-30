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
 * Three roles, and none of them stored
 * ------------------------------------
 * A band does one of three things: it **steals** an unguarded civilian, it
 * **escorts** one home, or it **raids**. Which of the three a given unit is
 * doing is *derived from the board every turn* (`barbarianRoles`) and never
 * written down — see that type's docblock for why stored intent would be a
 * serialisation problem, a staleness problem and a replay problem at once, and
 * how the two facts a memory would have carried (which camp is home, which
 * raider is the captor) fall out of geometry instead.
 *
 * The priority is **escort > theft > raid**, expressed as the order the three
 * derivation passes run in. A soldier walking a prisoner home ignores a scout
 * that wanders past: a band that dropped its cargo for every fresh target would
 * never get one home, which is the whole behaviour.
 *
 * Theft is not a mechanism of its own
 * -----------------------------------
 * A thief walks to the doorstep and attacks through `applyCombat`, exactly as a
 * raider does. The tile-targeting priority already published there (walls, then
 * the garrison, then capture — civilians last) does the rest: a lone civilian is
 * *captured* by a melee blow, and one with a soldier on its hex is not — the
 * blow hits the soldier. So "barbarians steal workers" and "a warrior captures a
 * settler" are one rule with one implementation (`captureUnit`), and a guarded
 * civilian is safe from the wild for precisely the reason it is safe from an
 * empire.
 *
 * Still deliberately small
 * ------------------------
 * Barbarians pillage improvements by standing on them — through the *player's*
 * verb, `pillageAt`, so there is no second razing rule with the wild's name on it
 * any more than there is a second combat evaluator — and **they do not capture
 * cities**. `capturesCity` (`combat.ts`) is false whenever the attacker is
 * `isBarbarian`, so a camp's blow at a beaten, undefended town still lands but
 * does nothing: the city is already on the floor and stays exactly where it is,
 * to heal (`healCities`) once the siege lifts. That is not the ranged-fire rule
 * read one step further out any more — melee counts too, since the 2026-08-28
 * three-beat siege — it is a clause of its own, asked of the attacker's seat and
 * nothing else on the board. Capture *by a nation* is the ordinary rule; capture
 * *by the wild* is a real design decision (what does a barbarian *do* with a
 * town?) and stays deferred. A stolen **settler** is the same decision seen from
 * the other side and needs no rule at all: it is a unit in barbarian hands like
 * any other, it will never found, and it is cargo.
 */

import { campAt, hasCampAt } from './camps';
import { tileOwnerPlayerId } from './cities';
import { applyCombat, isCombatant } from './combat';
import { pillageAt, pillageError } from './improvements';
import type { TurnReport } from './turn';
import { cardBehaviorRule } from './statecraft';
import { type GameMap, type Tile, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from './map';
import { advanceAlongPath } from './movement';
import { type Cell, canStopOn, findPath, isPassable } from './pathfind';
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
import { hasStackingRoom, unitsOnTile } from './units';
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

/**
 * Barbarian *soldiers* close enough to this camp to still count as its garrison.
 *
 * Civilians are excluded, and the exclusion is a rule: a stolen worker sitting
 * on the camp is **loot, not a band**, and counting it would let an empire
 * suppress a camp's musters by leaving it a worker to keep. The wild's cargo is
 * a thing to be taken back, never a thing that fights.
 */
function bandOf(state: GameState, camp: BarbarianCamp, wild: Player): number {
  const { map } = state;
  const centre = getTileAt(map, camp.col, camp.row);
  if (!centre) return 0;
  const hex = tileHex(centre);
  let count = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== wild.id) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
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
export function nearestTarget(state: GameState, wild: Player, unit: Unit): RaidTarget | null {
  const { map } = state;
  const from = getTileAt(map, unit.col, unit.row);
  if (!from) return null;
  const hex = tileHex(from);

  const candidates: RaidTarget[] = [];
  let order = 0;
  const consider = (col: number, row: number, ownerId: number): void => {
    if (ownerId === wild.id) return;
    // Wolf-Mother's Pact: **barbarians never attack you.** The one
    // `behaviorRule` the vocabulary has, and it is read here rather than inside
    // `applyCombat` on purpose — the pact is a fact about what the wild *wants*,
    // not a rule that makes an empire unhittable, so the raid simply never picks
    // this seat and everything else about combat is unchanged. Theft continues,
    // because a thief's prey is chosen by `barbarianRoles` and not by this
    // function: the wolves take their share, they just do not come for the
    // spears. See `docs/deprecated/statecraft-cards.md`.
    if (cardBehaviorRule(state, ownerId, 'barbariansPassive')) return;
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

// --- roles ------------------------------------------------------------------

/**
 * What one barbarian unit is doing this turn.
 *
 * **Derived, never stored**, and that is the load-bearing decision of this whole
 * feature rather than a style preference. A `role` field on `Unit` would be
 * *intent*, and intent is state: it would have to be serialised (so every save
 * grows a field), kept in step with a world that moves under it (a thief whose
 * prey died, an escort whose cargo was rescued, a raider whose camp burnt out),
 * and — worst — it would have to be **written by the phase**, which means a
 * replay reproduces it only for as long as every write is reproduced in the same
 * order. Derived intent has none of those problems by construction: the roles
 * are a pure function of the board, so a replay recomputes them rather than
 * trusting them, and a hand-edited save cannot carry an opinion the world does
 * not support.
 *
 * It also means the wild has no memory, and the two places that would obviously
 * want one are answered by geometry instead:
 *
 *   · *"the camp that spawned its captor"* is not recoverable without storing a
 *     home on the unit, so a cargo walks to the **nearest camp** — which, on the
 *     turn after a theft, is the camp its captor came out of in every ordinary
 *     case, and is the *better* answer in the case where it is not (the raiders'
 *     own camp burnt out behind them).
 *   · *"the raider that took it"* is likewise not stored: a cargo's escort is
 *     whichever wild soldier is standing **nearest** to it, which on the turn
 *     after a theft is exactly the thief that took it, because that thief is
 *     standing next to it and nobody else is.
 */
export type BarbarianRole =
  /** A stolen civilian walking itself home, or already sitting on the camp. */
  | { kind: 'cargo'; home: Cell | null }
  /** A soldier shadowing that civilian, and doing nothing else at all. */
  | { kind: 'escort'; cargoId: number }
  /** A soldier going for an unguarded civilian it can see. */
  | { kind: 'thief'; preyId: number }
  /** Everybody else: v1's raider. */
  | { kind: 'raider' };

/** The camp nearest this cell, by `(distance, tile index)`, or `null`. */
function nearestCamp(state: GameState, from: Tile): Tile | null {
  const { map } = state;
  const hex = tileHex(from);
  let best: Tile | null = null;
  let bestDistance = Infinity;
  let bestIndex = Infinity;
  for (const camp of state.camps) {
    const tile = getTileAt(map, camp.col, camp.row);
    if (!tile) continue;
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

/** Is this unit standing on a camp? Cargo that is home, and stays there. */
function isAtCamp(state: GameState, unit: Unit): boolean {
  return hasCampAt(state, unit.col, unit.row);
}

/**
 * The nearest of `pool` to `tile`, by `(distance, tile index, unit id)`, within
 * `radius` and passing `accept`. A total order over distinct units, so two
 * raiders equidistant from the same worker always resolve the same way.
 */
function nearestUnit(
  state: GameState,
  pool: readonly Unit[],
  tile: Tile,
  radius: number,
  accept: (unit: Unit) => boolean,
): Unit | null {
  const { map } = state;
  const hex = tileHex(tile);
  let best: Unit | null = null;
  let bestDistance = Infinity;
  let bestIndex = Infinity;
  for (const unit of pool) {
    const at = getTileAt(map, unit.col, unit.row);
    if (!at) continue;
    const distance = wrappedDistance(map, hex, tileHex(at));
    if (distance > radius) continue;
    if (!accept(unit)) continue;
    // Tile index, then id. The id is not redundant even though two soldiers
    // cannot share a hex under a stacking cap of 1: the cap is a data knob, and
    // a designer who raises it must not also make this answer depend on array
    // luck.
    const index = tileIndex(map, at.col, at.row);
    const closer =
      distance < bestDistance ||
      (distance === bestDistance &&
        (index < bestIndex || (index === bestIndex && best !== null && unit.id < best.id)));
    if (closer) {
      best = unit;
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return best;
}

/**
 * Is this civilian stealable *by walking up to it* — that is, is anything
 * standing over it?
 *
 * Asked of the tile rather than of the neighbourhood, because the stacking rule
 * is what decides it: a guard shares its charge's hex (one military and one
 * civilian per tile, `stacking.perCategoryPerTile`), and `attackTargetAt` hits
 * the **military unit first**. So a raider that walks up to a guarded worker
 * gets a fight, not a prisoner — the civilian is safe without a line of code
 * saying so, and this function only decides whether the wild bothers to *try*.
 *
 * A soldier standing one hex away is not a guard by this rule and is not meant
 * to be: that is a rescue attempt, not protection, and the raider is entitled to
 * get there first.
 */
function isUnguarded(state: GameState, civilian: Unit): boolean {
  for (const unit of unitsOnTile(state, civilian.col, civilian.row)) {
    if (unit.id === civilian.id) continue;
    if (isCombatant(unitDef(unit.type))) return false;
  }
  return true;
}

/**
 * Every job in the wild, derived from one board state.
 *
 * Computed **once**, at the top of the sweep, from the board the turn produced —
 * before a single barbarian has moved. That is deliberate and it is the same
 * argument the `veterans` snapshot makes: a unit acting late in the array must
 * not have a different job because a friend of its acted early. It also makes
 * the two exclusivity rules expressible at all, since both are about who *else*
 * is available:
 *
 *   · **one escort per cargo** — the nearest soldier within `escortRadius`, and
 *     that soldier is then spoken for;
 *   · **one thief per prey** — the nearest *unspoken-for* soldier within
 *     `theftRadius`, so a camp does not send four raiders after one worker.
 *
 * The priority is **escort > theft > raid**, and it is expressed as the order
 * these three passes run in rather than as a rule anybody has to remember. A
 * soldier walking a prisoner home therefore ignores a scout that wanders past —
 * *the cargo is worth more than the fight*, and a band that dropped its
 * prisoner every time something shinier appeared would never get one home, which
 * is the entire behaviour this entry exists to produce.
 *
 * `ids` is the snapshot the sweep will walk, so a band mustered this turn is
 * neither given a job nor counted as somebody else's escort.
 */
export function barbarianRoles(
  state: GameState,
  wild: Player,
  ids: readonly number[],
): Map<number, BarbarianRole> {
  const roles = new Map<number, BarbarianRole>();
  const band: Unit[] = [];
  const cargo: Unit[] = [];
  for (const id of ids) {
    const unit = unitById(state, id);
    if (!unit || unit.ownerId !== wild.id) continue;
    if (isCombatant(unitDef(unit.type))) band.push(unit);
    else cargo.push(unit);
  }

  // 1 — the cargo, and its walk home.
  for (const unit of cargo) {
    const from = getTileAt(state.map, unit.col, unit.row);
    const home = from ? nearestCamp(state, from) : null;
    roles.set(unit.id, { kind: 'cargo', home: home ? { col: home.col, row: home.row } : null });
  }

  // 2 — escorts. A cargo already sitting on its camp needs none: it has arrived,
  // and its guard goes back to raiding, which is the rule read as an absence
  // rather than as a second clause somewhere.
  const spokenFor = new Set<number>();
  for (const prisoner of cargo) {
    if (isAtCamp(state, prisoner)) continue;
    const at = getTileAt(state.map, prisoner.col, prisoner.row);
    if (!at) continue;
    const escort = nearestUnit(
      state,
      band,
      at,
      BARB.escortRadius,
      (unit) => !spokenFor.has(unit.id),
    );
    if (!escort) continue;
    spokenFor.add(escort.id);
    roles.set(escort.id, { kind: 'escort', cargoId: prisoner.id });
  }

  // 3 — thieves. Walked over the *prey* rather than over the band, because the
  // rule is "the nearest raider takes it" and that sentence is about a worker.
  // Prey is anybody else's civilian, unguarded, inside `theftRadius`, on a hex
  // the wild can actually see (below), with a hex beside it the raider could
  // stand on — the same doorstep test raiding uses.
  for (const prey of state.units) {
    if (prey.ownerId === wild.id) continue;
    // Wolf-Mother's Pact, the other half (user, 2026-08-28: "barbarians never
    // attack you — no civilian unit thefts"). `nearestTarget` already keeps a
    // raider from marching on this seat, but a *thief* picks its prey here and
    // not there, so without this clause the wolves left the spears alone and
    // still walked off with every worker. Read at the same seam and by the same
    // rule: the pact is a fact about what the wild *wants*, so the theft is
    // never planned rather than refused after the fact.
    if (cardBehaviorRule(state, prey.ownerId, 'barbariansPassive')) continue;
    if (isCombatant(unitDef(prey.type))) continue;
    if (!isVisibleTo(state, wild.id, prey.col, prey.row)) continue;
    if (!isUnguarded(state, prey)) continue;
    const at = getTileAt(state.map, prey.col, prey.row);
    if (!at) continue;
    const thief = nearestUnit(
      state,
      band,
      at,
      BARB.theftRadius,
      (unit) =>
        !spokenFor.has(unit.id) &&
        (isAdjacentTo(state, unit, at) || approachTile(state, unit, at) !== null),
    );
    if (!thief) continue;
    spokenFor.add(thief.id);
    roles.set(thief.id, { kind: 'thief', preyId: prey.id });
  }

  // 4 — everybody left is v1's raider.
  for (const unit of band) {
    if (!roles.has(unit.id)) roles.set(unit.id, { kind: 'raider' });
  }
  return roles;
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
 * The works this raider is standing on, or `null`.
 *
 * **The gate is `pillageError`** — the player's own — and that is the whole
 * point: "military, with movement left, on somebody else's improvement or road"
 * is one sentence and the wild does not get its own copy of it, exactly as the
 * wild does not get its own copy of combat. What is asked *here* is the one
 * clause the verb deliberately leaves open. `pillageError` reads "somebody
 * else's" as **not yours**, so unowned ground with works on it is fair game for
 * an empire (a case that cannot arise in play, since towns are never destroyed);
 * the wild is held to the stricter reading — **a real empire's ground** — because
 * a raider is a thing that comes *for* somebody, and burning nobody's farm would
 * be the wild vandalising scenery.
 */
function worksUnderfoot(state: GameState, unit: Unit): Tile | null {
  const tile = getTileAt(state.map, unit.col, unit.row);
  if (!tile) return null;
  if (pillageError(state, unit.id) !== null) return null;
  if (tileOwnerPlayerId(state, tile.col, tile.row) === null) return null;
  return tile;
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

/** Walks a unit to a hex it can stand on, if a route exists. */
function marchTo(state: GameState, unit: Unit, goal: Tile): void {
  const path = findPath(state, unit, goal);
  if (path) advanceAlongPath(state, unit, path);
}

/**
 * Closes on a tile and strikes it if the march arrived in reach.
 *
 * The one thing both a raider and a thief do, and the reason theft needed no
 * capture mechanism of its own: the blow goes through `applyCombat`, which
 * targets the tile by the *published* priority (walls, then the garrison, then
 * capture — civilians last) and turns a melee blow on a lone civilian into a
 * change of hands. A thief is therefore a raider that has chosen a worker; the
 * *rule* that hands the worker over is the rule a player's warrior has always
 * captured by — and the one beat this closes that a player's warrior does not
 * share is the city itself: `capturesCity` refuses the wild, so a raider that
 * reaches the `capture` beat against a town still strikes, and the town stays
 * where it stands.
 */
function closeAndStrike(
  state: GameState,
  unit: Unit,
  goal: Tile,
  report?: TurnReport,
): void {
  if (!isAdjacentTo(state, unit, goal)) {
    const approach = approachTile(state, unit, goal);
    if (approach) marchTo(state, unit, approach);
  }
  // Re-read: the march may have brought this unit into reach. `applyCombat`
  // validates everything else — range, line of sight, movement, visibility,
  // whether the target is still there — and refuses cleanly, leaving the state
  // byte-identical.
  const after = unitById(state, unit.id);
  if (!after || after.hasAttacked || after.movesLeft <= 0) return;
  if (!isAdjacentTo(state, after, goal)) return;
  const struck = applyCombat(state, after.id, { col: goal.col, row: goal.row });
  // The one thing the wild owes the interface: **it happened, and here is who**.
  // See `TurnReport` — the blow is over and the board cannot be asked about it,
  // and a raid a player is never told about is a raid they discover by counting
  // their army. A refused blow reports nothing, exactly as it changes nothing.
  if (struck.ok) report?.combats.push(struck.outcome);
}

/**
 * A stolen civilian walks itself home and then sits there.
 *
 * At civilian speed, by the ordinary pathfinder, over ground the ordinary rules
 * allow — the wild's prisoners are units like any other and get no dispensation.
 * It **does not clear the camp it walks onto**: `arriveOnTile` refuses the wild
 * its own bounty, which is the rule that was already there.
 *
 * A cargo standing on a camp does nothing at all, ever, and that idleness is the
 * design: a stolen settler will never found (barbarians do not found), a stolen
 * worker will never build. It is cargo — a thing an empire has *lost* and can
 * ride out and take back — and the camp is where it waits to be taken back.
 *
 * With no camps left in the world it sits where it stands: there is nowhere to
 * be walked to, and inventing a destination would be inventing a rule.
 */
function haulHome(state: GameState, unit: Unit, home: Cell | null): void {
  if (home === null) return;
  if (unit.col === home.col && unit.row === home.row) return;
  const tile = getTileAt(state.map, home.col, home.row);
  if (!tile) return;
  marchTo(state, unit, tile);
}

/**
 * A raider shadowing its cargo: it keeps station and it does not fight.
 *
 * Station is *the cargo's own hex* when it can be shared, and adjacency when it
 * cannot — and the preference is a rule rather than a tidiness: a soldier
 * standing on the prisoner's tile is exactly what makes that prisoner
 * unstealable back, by the same `attackTargetAt` priority that protects a
 * player's escorted worker from being stolen in the first place. The wild
 * guards its loot by the rule empires guard theirs by.
 *
 * Already within one hex, it holds — no wandering, no opportunistic attack on
 * the town it happens to be passing. See `barbarianRoles` for why escort duty
 * outranks everything.
 */
function shadow(state: GameState, unit: Unit, cargoId: number): void {
  const cargo = unitById(state, cargoId);
  if (!cargo) return;
  const at = getTileAt(state.map, cargo.col, cargo.row);
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!at || !from) return;
  // Already keeping station: hold. Zero counts — a guard on the cargo's own hex
  // is the strongest place it can be.
  if (wrappedDistance(state.map, tileHex(at), tileHex(from)) <= 1) return;
  const station = canStopOn(state, unit, at) ? at : approachTile(state, unit, at);
  if (station) marchTo(state, unit, station);
}

/**
 * Marches and fights, one unit at a time, in the order the state carries.
 *
 * `veterans` is a snapshot taken before this turn's camps mustered, so a band
 * born this resolution does not also march in it — the same reading a city's new
 * unit gets, which is that it is born with a full allowance and spends it when
 * its owner next acts.
 *
 * Every job is looked up in the table `barbarianRoles` derived from the board
 * before anybody moved; the sweep itself only *executes*. Each unit, in order:
 *
 *   · **cargo** walks toward the nearest camp, or sits on it;
 *   · **escort** closes to within a hex of its cargo, and does nothing else;
 *   · **thief** closes on its chosen civilian and strikes, which captures it;
 *   · **raider** strikes what is already in reach, else **burns the works it is
 *     standing on**, else does what v1 did — nearest visible thing inside
 *     `aggressionRadius`, close on it, wander near camp otherwise.
 *
 * Every blow goes through `applyCombat`, so a raid rolls the same dice, obeys
 * the same targeting priority, takes the same counter-attack and triggers the
 * same elimination check a player's attack does — and the +2 every empire gets
 * against the wild is inside the same plan (`planCombat`), which is why the
 * forecast a player was shown is the fight the raider gets.
 *
 * A unit that died earlier in this very sweep — killed by the counter-attack of
 * the raider before it — is looked up by id and skipped, which is the ordinary
 * command contract read inside a phase. A unit whose *job* died with it (a thief
 * whose prey was taken by the raider before it) is refused by `applyCombat` and
 * simply loses the turn, which is the same contract one layer up.
 *
 * **The wild carries no standing orders.** Every walk in this sweep ends with
 * the unit's `path` deleted, and that is the same decision the roles are: a
 * stored route is stored intent, `resetMovement` would resume it a few phases
 * later — handing every barbarian a free second march on a refilled allowance —
 * and it would be an opinion formed on a board two turns stale. The wild decides
 * again, from scratch, every turn.
 */
export function raid(
  state: GameState,
  veterans: readonly number[],
  report?: TurnReport,
): void {
  const wild = barbarianPlayer(state);
  if (!wild) return;
  const roles = barbarianRoles(state, wild, veterans);

  for (const id of veterans) {
    const unit = unitById(state, id);
    if (!unit || unit.ownerId !== wild.id) continue;
    const role = roles.get(id);
    if (!role) continue;
    if (unit.movesLeft > 0) {
      switch (role.kind) {
        case 'cargo':
          haulHome(state, unit, role.home);
          break;
        case 'escort':
          shadow(state, unit, role.cargoId);
          break;
        case 'thief': {
          const prey = unitById(state, role.preyId);
          const at = prey === undefined ? null : getTileAt(state.map, prey.col, prey.row);
          if (at) closeAndStrike(state, unit, at, report);
          break;
        }
        case 'raider': {
          const target = nearestTarget(state, wild, unit);
          // **Strike, then burn, then march** — the raider's three beats, in
          // that order, and the order is the rules decision (2026-08-28).
          //
          //   · A target already *in reach* is hit, because a blow is worth more
          //     than a farm and a raider that stopped to burn one while a
          //     wounded scout stood beside it would be reading the board wrong.
          //     This is the branch v1 already took: `closeAndStrike` on an
          //     adjacent target never marched.
          //   · Otherwise, the works underfoot. "Instead of moving on" is the
          //     whole of it — the wild is *local weather*, and weather that
          //     walks over a farm on its way somewhere else is not weather.
          //   · Otherwise, v1: close on what it can see, or drift near camp.
          //
          // Only a **raider** ever burns anything, and the other three roles'
          // silence here is the same priority `barbarianRoles` publishes: an
          // escort does nothing but escort, a thief is already spoken for by one
          // worker, and cargo is cargo. See that function's docblock.
          if (target && isAdjacentTo(state, unit, target.tile)) {
            closeAndStrike(state, unit, target.tile, report);
            break;
          }
          const works = worksUnderfoot(state, unit);
          if (works) {
            // The player's verb, unchanged, so the farm and the road under it go
            // together and the *victim's* panel is refreshed on the spot
            // (`refreshTileDerived`). The wild keeps the bandage and forfeits the
            // salvage — `pillageAt` says so and says why.
            report?.pillages.push(pillageAt(state, unit, works));
            break;
          }
          if (target) closeAndStrike(state, unit, target.tile, report);
          else wander(state, unit);
          break;
        }
      }
    }
    const after = unitById(state, id);
    if (after) delete after.path;
  }
}

// --- the turn phase ---------------------------------------------------------

/**
 * `barbarians`: the wild takes its turn.
 *
 * Three steps in a fixed order — found, muster, raid — and the snapshot between
 * the first two and the last is what keeps a band from marching on the turn it
 * was mustered. The roles are derived inside `raid`, off the board as it stands
 * once the camps have mustered, and the sweep then only executes them.
 *
 * **The position in `END_OF_TURN_PHASES` is unchanged by the raiding rework**,
 * and the check is worth stating rather than assuming: the three new behaviours
 * spend movement and land blows exactly as v1's raiding did — a cargo *walks*,
 * an escort *walks*, a thief *attacks* — so every argument below is about the
 * same two facts (an allowance that must not have been refilled, a board that
 * must be the one the turn produced) and none of them changed.
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
export function barbarianTurn(state: GameState, report?: TurnReport): void {
  const wild = barbarianPlayer(state);
  if (!wild) return;

  foundCamps(state);
  // The snapshot, by id rather than by reference: `applyCombat` removes dead
  // units from `state.units`, and a list of objects would keep corpses marching.
  const veterans = state.units.filter((unit) => unit.ownerId === wild.id).map((unit) => unit.id);
  musterCamps(state);
  raid(state, veterans, report);
}

/** Every camp on the board, as cells — a pure read for the renderer and tests. */
export function campCells(state: GameState): { col: number; row: number }[] {
  return state.camps.map((camp) => ({ col: camp.col, row: camp.row }));
}

/** Is there a camp here? Re-exported so callers ask the wild about the wild. */
export { campAt, hasCampAt };
