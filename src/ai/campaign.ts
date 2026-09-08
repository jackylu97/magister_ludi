/**
 * **The campaign**: the operational plan a seat at war re-reads off the board
 * every time it is asked, and never stores.
 *
 * Why a file of its own
 * ---------------------
 * `bot.ts` is six and a half thousand lines and every one of the readings below
 * is wanted by **two** callers that must not import each other: the declaration
 * (`declareDecision`, `src/ai/diplomacy.ts`) has to know whether this empire
 * *has* a force and a road before it starts a war, and the march
 * (`campaignMarch`, `bot.ts`) has to know where that force is going once the war
 * is on. `diplomacy.ts` is imported *by* `bot.ts`, so a reading kept in `bot.ts`
 * could not be asked by the declaration without a cycle — and a cycle in the
 * module runner comes out empty rather than failing to compile (CLAUDE.md).
 * So the readings live in a leaf under both.
 *
 * What is in here is therefore exactly the *shared* half — the force, the road,
 * the target, the muster and who stands at it. What a **piece** does about any
 * of that is a policy with candidates and printed terms, and stays in `bot.ts`
 * beside its siblings.
 *
 * The three disciplines are `bot.ts`' own
 * ---------------------------------------
 *   · **Stateless.** Nothing here is remembered between calls. The target town,
 *     the muster hex and the answer to *are we mustered yet* are all recomputed
 *     from `state` on every ask, which is what lets a bot with no memory
 *     prosecute a war that takes twenty turns: the plan is a *function of the
 *     board*, so a piece that arrives late reads the same plan the ones that
 *     arrived first did.
 *   · **It never reimplements a rule.** Where a piece may stand is `canStopOn`,
 *     how it would get there is `findPath`, and neither is second-guessed here.
 *   · **Ties break on facts about the board** — distance, then garrison, then
 *     map order — never on the order a loop happened to visit an array in.
 */

import { type AiConfig } from './aiConfig';

import { type Tile, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../sim/map';
import { type Cell, type MoveProfile, canStopOn, findPath, moveProfile } from '../sim/pathfind';
import type { City, GameState, Player, Unit } from '../sim/state';
import { type UnitDef, isCombatant, isExplorer, isRanged, unitDef } from '../sim/unitData';

/**
 * **A piece of the field army** — what the levy counts, what the mix is a mix
 * of, and what a strike force is made of, by the markers and never by a name.
 *
 * A scout has a combat strength (it can be attacked and it can defend a hill),
 * so `isCombatant` is true of it — and it is nevertheless *not* a soldier in the
 * only sense the levy means: it is a ranging piece, governed by its own count
 * (`countRangers`) against its own cap, appraised down its own branch of
 * `valueOfUnit`, and it is the piece an empire sends *away* from its towns. A
 * hull is excluded for the same reason from the other side: this bot has no
 * opinion about ships and never builds one, so counting them would be counting
 * an army it did not raise — and a hull can reach no inland town, which is the
 * campaign's own reason for the same exclusion.
 *
 * One predicate rather than two so the readings inside one fold cannot disagree:
 * the levy's *"this empire wants 7 soldiers and holds n"*, the mix's *"n of m in
 * this army are melee"* and the campaign's *"4 pieces beyond the garrisons"* now
 * count the same pieces. The first two did not, and it was a measurable gap in
 * the threat reading — a seat with a column at its gate, three scouts on the map
 * and one warrior in its town read itself as 57% of the way to the levy it
 * wanted, charged the next spearman three quarters of its worth for an army it
 * did not have, and started a worker (2026-09-05, the fourteen-turn bench, seed
 * 20260831).
 *
 * It lives here rather than in `bot.ts` because the declaration asks it too, and
 * `diplomacy.ts` may not import `bot.ts`. See the module docblock.
 */
export function isFieldSoldier(def: UnitDef): boolean {
  return isCombatant(def) && !isExplorer(def) && def.category !== 'naval';
}

/**
 * **The piece that opens a town**: one that shoots, or one whose whole trade is
 * knocking walls down.
 *
 * Read off the roster's own two markers rather than off a list of names, which
 * is the discipline every reading in `src/ai/` keeps: `isRanged` is the rules'
 * question (*has it a ranged strength and a range*) and `modelClass === 'siege'`
 * is the roster's statement of what a piece **is**. Every siege engine in the
 * roster today shoots as well, so the second clause changes no answer yet — it
 * is there because a ram that batters a gate at strength and range one is a
 * siege piece the day somebody writes the row, and a predicate that only knew
 * about bows would quietly leave it out of every strike force.
 */
export function isSiegePiece(def: UnitDef): boolean {
  return isRanged(def) || def.modelClass === 'siege';
}

/** How many of this empire's soldiers are standing in this town. */
export function garrisonAt(state: GameState, playerId: number, city: City): number {
  let count = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (unit.col !== city.col || unit.row !== city.row) continue;
    if (isCombatant(unitDef(unit.type))) count += 1;
  }
  return count;
}

/** Every field soldier of this seat, in log order. */
export function fieldSoldiersOf(state: GameState, playerId: number): Unit[] {
  const list: Unit[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (isFieldSoldier(unitDef(unit.type))) list.push(unit);
  }
  return list;
}

/**
 * **What this empire could send**, as the declaration's second clause reads it
 * (`docs/war-diplomacy.md` §13.1).
 *
 * Not *how big is the army* but **how much of it is spare**: the garrisons every
 * town of this empire is owed (`military.garrisonPerCity` apiece) come off the
 * top, because a soldier standing in the capital is not a soldier that can march
 * on anybody. Five warriors in five towns is a strike force of nothing, which is
 * exactly the sentence the ratio alone could not say — and it is what stops a
 * peaceful empire declaring on an unarmed neighbour it has no army to reach.
 *
 * `siege` is the other half of the clause: the pieces that open a town. A stack
 * of spearmen at a wall is a stack that trades hit points with a garrison for
 * ever, so a force with nothing that shoots is not a force at all.
 */
export interface StrikeForce {
  /** Every field soldier of this empire, in log order. */
  soldiers: Unit[];
  /** The garrisons the towns are owed, summed — what comes off the top. */
  owed: number;
  /** Soldiers beyond the garrisons. Never negative. */
  spare: number;
  /** The first piece in the force that shoots or lays siege, or `null`. */
  siege: Unit | null;
}

export function strikeForce(state: GameState, player: Player, ai: AiConfig): StrikeForce {
  const soldiers = fieldSoldiersOf(state, player.id);
  let towns = 0;
  for (const city of state.cities) if (city.ownerId === player.id) towns += 1;
  const owed = towns * Math.max(0, ai.military.garrisonPerCity);
  let siege: Unit | null = null;
  for (const unit of soldiers) {
    if (siege === null && isSiegePiece(unitDef(unit.type))) siege = unit;
  }
  return { soldiers, owed, spare: Math.max(0, soldiers.length - owed), siege };
}

/**
 * The hexes beside a town that `unit` could actually come to rest on.
 *
 * **A foreign town's own hex is never a path's goal**, and that is a rule rather
 * than a convenience: `canTransit` refuses a hex holding somebody else's city
 * outright, because a town is taken by capture and never by a march
 * (`pathfind.ts`). So `findPath(state, unit, townTile)` answers `null` for every
 * enemy town on the board, always — which is why the old `warMarch` could walk a
 * piece at a rival's *column* and never once at its walls, and why every reading
 * of "can we get there" in this file asks about the ring instead.
 *
 * Ordered nearest-to-the-piece first, then by map order, so which hex a probe
 * tries first is a fact about the board.
 */
export function approachHexes(
  state: GameState,
  unit: Unit,
  city: City,
  within = 1,
  mover?: MoveProfile,
): Tile[] {
  return standingsNear(state, unit, { col: city.col, row: city.row }, within, true, mover);
}

/**
 * Every hex within `within` of a place that `unit` could come to rest on,
 * nearest-to-the-piece first and then map order.
 *
 * The muster's half of `approachHexes` and the same function underneath: what a
 * march wants is not a hex but *somewhere about here I may actually stand*, and
 * the two things a bot gets wrong about that — a hex under somebody else's town
 * and a hex with no stacking room left — are both `canStopOn`'s to answer rather
 * than this file's.
 */
export function standingsNear(
  state: GameState,
  unit: Unit,
  at: Cell,
  within: number,
  skipCentre: boolean,
  /**
   * The profile the standing is judged by. Defaults to the piece's own; the
   * declaration's road probe hands in one with the borders taken out, because
   * every hex beside a rival's town is inside that rival's borders and at peace
   * the ring would come back empty. See `openMover`.
   */
  profile?: MoveProfile,
): Tile[] {
  const centre = getTileAt(state.map, at.col, at.row);
  if (!centre) return [];
  const from = getTileAt(state.map, unit.col, unit.row);
  const here = from === undefined ? tileHex(centre) : tileHex(from);
  const mover = profile ?? moveProfile(state, unit);
  const ring: { tile: Tile; distance: number }[] = [];
  for (const tile of mapRange(state.map, tileHex(centre), Math.max(0, within))) {
    if (skipCentre && tile.col === at.col && tile.row === at.row) continue;
    if (!canStopOn(state, unit, tile, mover)) continue;
    ring.push({ tile, distance: wrappedDistance(state.map, here, tileHex(tile)) });
  }
  ring.sort((a, b) => a.distance - b.distance);
  return ring.map((row) => row.tile);
}

/**
 * The same profile with the **closed borders taken out of it**.
 *
 * Asked by the declaration's road clause and by nothing else. At peace a
 * soldier may not enter a rival's fields at all (`closedBordersFor` — a wall,
 * not a toll), so a road probed before the declaration would come back `null`
 * for every target that has any territory around it, and the clause would refuse
 * every war anybody could actually fight. The border the probe steps over is the
 * one the declaration itself opens, which is what makes ignoring it honest
 * rather than omniscient: it is a question about the board *after* the command,
 * asked before sending it.
 */
function openMover(state: GameState, unit: Unit): MoveProfile {
  const { closed: _sealed, ...open } = moveProfile(state, unit);
  return open;
}

/**
 * **The road**: a piece of the force with a way to the target town, or `null` —
 * the declaration's third clause.
 *
 * Bounded on purpose. `findPath` is the most expensive question this bot asks
 * and the declaration is re-asked on every command a seat sends, so the probe
 * tries the `search.pathProbes` pieces standing nearest the town and, for each,
 * the two nearest hexes of its ring. A force whose only route is a piece on the
 * far side of the continent therefore reads as *no road*, which is the right
 * answer for a policy about where an army can march this decade.
 */
export function campaignRoad(
  state: GameState,
  force: StrikeForce,
  city: City,
  ai: AiConfig,
): { piece: Unit; steps: number } | null {
  const centre = getTileAt(state.map, city.col, city.row);
  if (!centre) return null;
  const here = tileHex(centre);
  const ranked = force.soldiers
    .map((unit) => {
      const tile = getTileAt(state.map, unit.col, unit.row);
      return {
        unit,
        distance: tile === undefined ? Infinity : wrappedDistance(state.map, here, tileHex(tile)),
      };
    })
    .filter((row) => Number.isFinite(row.distance))
    .sort((a, b) => a.distance - b.distance || a.unit.id - b.unit.id);
  for (const row of ranked.slice(0, Math.max(1, ai.search.pathProbes))) {
    const mover = openMover(state, row.unit);
    for (const goal of approachHexes(state, row.unit, city, 1, mover).slice(0, 3)) {
      const path = findPath(state, row.unit, goal, mover);
      if (path !== null) return { piece: row.unit, steps: path.length };
    }
  }
  return null;
}

/**
 * **One target town per enemy** (§13.3): the enemy's town nearest any town of
 * this empire.
 *
 * Nearest *to our ground* rather than to a piece, and that is the whole
 * difference between a campaign and the wandering the old `warMarch` did: a
 * target chosen by where a soldier happens to be standing changes every time the
 * soldier moves, so no two pieces of one army ever agree on where they are
 * going. A target chosen by where this empire's towns are is the same answer for
 * every piece, on every turn, without anybody remembering anything.
 *
 * Ties by the weaker garrison, then by map order — both facts about the board.
 *
 * An empire with no towns at all falls back to its pieces, because a seat whose
 * last town has fallen still has an army and still has somewhere to take it.
 */
export function campaignTarget(
  state: GameState,
  player: Player,
  enemy: Player,
): { city: City; distance: number } | null {
  const anchors: Cell[] = [];
  for (const city of state.cities) {
    if (city.ownerId === player.id) anchors.push({ col: city.col, row: city.row });
  }
  if (anchors.length === 0) {
    for (const unit of fieldSoldiersOf(state, player.id)) {
      anchors.push({ col: unit.col, row: unit.row });
    }
  }
  if (anchors.length === 0) return null;
  let best: { city: City; distance: number; garrison: number } | null = null;
  for (const city of state.cities) {
    if (city.ownerId !== enemy.id) continue;
    const tile = getTileAt(state.map, city.col, city.row);
    if (!tile) continue;
    const here = tileHex(tile);
    let nearest = Infinity;
    for (const anchor of anchors) {
      const from = getTileAt(state.map, anchor.col, anchor.row);
      if (!from) continue;
      const distance = wrappedDistance(state.map, here, tileHex(from));
      if (distance < nearest) nearest = distance;
    }
    if (!Number.isFinite(nearest)) continue;
    const garrison = garrisonAt(state, enemy.id, city);
    if (
      best === null ||
      nearest < best.distance ||
      (nearest === best.distance && garrison < best.garrison)
    ) {
      best = { city, distance: nearest, garrison };
    }
  }
  return best === null ? null : { city: best.city, distance: best.distance };
}

/**
 * **The muster** (§13.3): the hex `war.musterDistance` steps short of the target,
 * along the road from this empire's nearest town.
 *
 * Short of the walls rather than at them, and that is the entire operational
 * idea: a piece that walks straight at a town arrives alone, fails the exchange
 * beside the wall and parks there — which is the diagnosis this batch answers.
 * A hex three steps back is somewhere an army can *gather*, and it is a hex both
 * the piece that set out first and the piece that was built six turns later
 * compute the same answer for, because it is a function of two towns and a road.
 *
 * The road is walked from the **town** rather than from the asking piece, so
 * every piece of the army is given the same muster. `findPath` starts a search
 * at a unit's own hex, so the prober is a positional copy of a real piece of
 * this seat's — a plain object handed to a pure query, never a piece put on the
 * board. What it buys is that the mover's own profile (its terrain, its
 * embarkation, its closed borders) is a real piece's rather than an invention.
 *
 * Falls back to the town's own hex when the road is shorter than the muster
 * distance, which is the ruling's own clause: a target three hexes from the
 * capital musters at the capital.
 */
export function musterHex(
  state: GameState,
  player: Player,
  target: City,
  prober: Unit,
  ai: AiConfig,
): { at: Cell; home: City } | null {
  const centre = getTileAt(state.map, target.col, target.row);
  if (!centre) return null;
  const here = tileHex(centre);
  let home: { city: City; distance: number } | null = null;
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    const tile = getTileAt(state.map, city.col, city.row);
    if (!tile) continue;
    const distance = wrappedDistance(state.map, here, tileHex(tile));
    if (home === null || distance < home.distance) home = { city, distance };
  }
  if (home === null) return null;
  // A positional copy: `findPath` searches from a unit's own hex and the road
  // wanted is the town's, not this piece's. See the docblock.
  const walker: Unit = { ...prober, col: home.city.col, row: home.city.row };
  const mover = moveProfile(state, walker);
  let path: Cell[] | null = null;
  // **Two rings, not one.** The hexes *beside* a town are exactly the hexes its
  // defenders are standing on, and a hex with somebody else's soldier on it is
  // not one `canStopOn` will end a route at — so a probe that only ever asked
  // the ring came back empty against precisely the towns worth besieging, and
  // the muster collapsed onto the capital. Measured on the duel bench (seed
  // 20260907, t30): thirteen pieces gathered six hexes out and never pushed,
  // because their muster was the town they had marched from.
  for (const goal of standingsNear(state, walker, { col: target.col, row: target.row }, 2, true).slice(
    0,
    Math.max(1, ai.search.pathProbes),
  )) {
    path = findPath(state, walker, goal, mover);
    if (path !== null) break;
  }
  const at = { col: home.city.col, row: home.city.row };
  if (path === null) return { at, home: home.city };
  // **The last hex on the road that is still `musterDistance` out.** Written as
  // a distance rather than as an index from the end, and that is what makes it
  // independent of where the road happened to be allowed to finish: a route
  // that ended two hexes from the walls and one that ended beside them name the
  // same muster.
  const back = Math.max(0, ai.war.musterDistance);
  for (let index = path.length - 1; index >= 0; index--) {
    const step = path[index];
    if (step === undefined) continue;
    const tile = getTileAt(state.map, step.col, step.row);
    if (!tile) continue;
    if (wrappedDistance(state.map, here, tileHex(tile)) < back) continue;
    if (!canStopOn(state, walker, tile, mover)) continue;
    return { at: { col: step.col, row: step.row }, home: home.city };
  }
  return { at, home: home.city };
}

/**
 * **The hexes this empire's other pieces are already walking to**, as tile
 * indices — the thing that has to be read before an army is given orders one
 * piece at a time.
 *
 * A stacking cap of one (`RULES.stacking.perCategoryPerTile`) means two soldiers
 * cannot share a hex; a `moveUnit` given to a piece with no movement left is
 * nevertheless accepted and **stored** as a standing order (CLAUDE.md: a move
 * ordered at zero movement is accepted as orders). So a seat that walks its
 * whole army through one arm in one turn can hand three pieces the same
 * destination — the first has not moved onto it yet, so `canStopOn` still says
 * yes to the second and the third — and two of them are then left holding a
 * march that can never finish. `unitAwaitsOrders` is false for a piece with a
 * stored path, so nothing ever asks them again.
 *
 * Measured on the flat bench (seed 20260907, t10): eleven soldiers, ten of them
 * holding a stored path to the single hex (13,8), frozen there for the rest of
 * the game while their target's walls stood at full height.
 *
 * A destination somebody is already walking to is therefore **claimed**, and the
 * next piece picks a different hex. It is a pure reading of `Unit.path`, which
 * is state and replays, rather than a register this file would have to keep.
 */
export function marchClaims(state: GameState, playerId: number, exceptId: number): Set<number> {
  const claimed = new Set<number>();
  for (const unit of state.units) {
    if (unit.ownerId !== playerId || unit.id === exceptId) continue;
    const path = unit.path;
    if (path === undefined || path.length === 0) continue;
    const last = path[path.length - 1];
    if (last === undefined) continue;
    claimed.add(tileIndex(state.map, last.col, last.row));
  }
  return claimed;
}

/**
 * **Is this piece walking to a hex it will never be allowed to stand on?**
 *
 * The other half of `marchClaims`: the pieces that were given a doomed order
 * before anybody claimed anything. A stored path is a standing order the
 * simulation resumes every turn (`resetMovement`), and one whose destination is
 * occupied is resumed, blocked and kept — for ever — with the piece invisible to
 * the bot the whole time, because `unitAwaitsOrders` reads a stored path as
 * *busy*. Read as *the rules would not let it stop there*, which is `canStopOn`
 * and not a second opinion about stacking.
 */
export function marchIsStalled(state: GameState, unit: Unit): boolean {
  const path = unit.path;
  if (path === undefined || path.length === 0) return false;
  const last = path[path.length - 1];
  if (last === undefined) return false;
  const tile = getTileAt(state.map, last.col, last.row);
  if (!tile) return true;
  return !canStopOn(state, unit, tile);
}

/**
 * **The force at the muster**: this seat's field soldiers standing within
 * `radius` of it, *or already past it*, in log order.
 *
 * The second clause is what keeps a push from flickering. Read as proximity
 * alone, a stack that had stepped off the muster toward the walls stopped
 * counting as mustered — so the force would push on one ask, fall under the
 * strike force on the next, and be told to walk back and gather. "Past it" is
 * measured the only way that needs nothing remembered: nearer the target than
 * the muster is.
 */
export function musteredNear(
  state: GameState,
  playerId: number,
  at: Cell,
  radius: number,
  target?: City,
): Unit[] {
  const centre = getTileAt(state.map, at.col, at.row);
  if (!centre) return [];
  const here = tileHex(centre);
  const walls =
    target === undefined ? null : (getTileAt(state.map, target.col, target.row) ?? null);
  const musterOut = walls === null ? 0 : wrappedDistance(state.map, tileHex(walls), here);
  const gathered: Unit[] = [];
  for (const unit of fieldSoldiersOf(state, playerId)) {
    const tile = getTileAt(state.map, unit.col, unit.row);
    if (!tile) continue;
    const hex = tileHex(tile);
    if (wrappedDistance(state.map, here, hex) <= Math.max(0, radius)) {
      gathered.push(unit);
      continue;
    }
    if (walls !== null && wrappedDistance(state.map, tileHex(walls), hex) <= musterOut) {
      gathered.push(unit);
    }
  }
  return gathered;
}
