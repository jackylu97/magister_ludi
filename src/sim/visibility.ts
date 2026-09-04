/**
 * Fog of war: what each empire can see, and what it merely remembers.
 *
 * Three states per player per tile, and they are an ordered scale rather than a
 * set of flags, because that is what they mean:
 *
 *   0 `hidden`    never seen. **Terra Incognita** — the blank chart.
 *   1 `explored`  seen once, not seen now. The terrain is remembered; nothing
 *                 that moves is.
 *   2 `visible`   seen right now, by a unit or a city or a border.
 *
 * `explored` is monotone and that is load-bearing: a tile that has been walked
 * on can never go back to being blank, so the "did I ever see this" half of the
 * scale is a bitwise OR that only ever climbs, and the "am I seeing it now" half
 * is recomputed from scratch. Storing one number for both is what makes the
 * whole thing a single array per player rather than two that could disagree.
 *
 * The sim stays omniscient
 * ------------------------
 * This module answers a *presentation* question and one rule. Commands validate
 * against the truth, Civ-style: a unit may be ordered into hidden territory,
 * pathfinding runs over the real map, and a settler may be sent to a coast
 * nobody has charted. Fog is not a second, blinded copy of the world — it is a
 * mask the interface reads.
 *
 * The one exception is `attack`, which requires the target tile be visible to
 * the attacker, because firing at a unit you cannot see is not a decision a
 * player could have made. That check lives in `planCombat` (`combat.ts`) so the
 * forecast and the reducer refuse it in the same breath.
 *
 * One evaluator for what a ridge hides
 * ------------------------------------
 * Sight uses `hasLineOfSight` from `los.ts` — the identical function ranged
 * combat aims with. A mountain strictly between an eye and a tile hides it, and
 * the mountain *itself* is seen, which falls out of the rule rather than being
 * special-cased: `hexLine` excludes the endpoints, so a blocker can never block
 * itself. You see the ridge; you do not see past it.
 *
 * What the cost actually is
 * -------------------------
 * A recompute gathers every source the player owns and floods each one's disc,
 * asking line of sight per tile: `O(sources × (3r² + 3r + 1))`, which for a
 * sight of 2 is nineteen tiles a unit and for a scout on a hill is thirty-seven.
 * Then it sweeps the player's grid once to turn "what is lit now" into the
 * delta, which is `O(tiles)` with a very small constant — an integer compare per
 * tile — and is the only part that does not scale with the empire. The *delta*
 * it reports is bounded by the neighbourhood that actually changed, which is the
 * property the renderer needs: one unit's step repaints a ring of tiles, never a
 * board. `test/stress.test.ts` pins both numbers.
 */

import { buildingCityStat, foldBuildingCityStat } from './buildingEffects';
import { type Hex, hexDistance } from './hex';
import { cardCityStat, cardUnitStat, foldCityStat } from './statecraft';
import { hasLineOfSight } from './los';
import { type GameMap, type Tile, getTileAt, mapRange, tileHex, tileIndex } from './map';
import { RULES } from './rulesData';
import type { City, GameState, Unit } from './state';
import { UNIT_TYPE_IDS, unitDef } from './unitData';

const VIS = RULES.visibility;
const CITIES = RULES.cities;

/**
 * The three levels, named. Plain numbers in the state because they are stored
 * per tile per player and a string per tile would triple the size of a save for
 * no reader's benefit — but nothing outside this file should write the literals.
 */
export const HIDDEN = 0;
export const EXPLORED = 1;
export const VISIBLE = 2;

/** One tile's level: 0 hidden, 1 explored, 2 visible. */
export type VisibilityLevel = typeof HIDDEN | typeof EXPLORED | typeof VISIBLE;

/**
 * A city as some player last saw it.
 *
 * The whole of "city memory": a banner on an explored-but-unwatched site should
 * still say what was there, dimmed, exactly as a paper chart keeps the town it
 * was drawn with. Kept per player and per city rather than as a flag on the city
 * itself, because two empires remember different things about the same town —
 * one may have watched it change hands and the other may not.
 *
 * Deliberately minimal: where it was, what it was called, whose it was. Not its
 * size, not its buildings, not its garrison. A remembered city is a name on a
 * map, and a memory that grew richer than that would be the interface quietly
 * telling the player things nobody scouted.
 */
export interface CitySighting {
  cityId: number;
  col: number;
  row: number;
  name: string;
  ownerId: number;
}

/** One tile whose level changed, in the delta a recompute reports. */
export interface VisibilityChange {
  col: number;
  row: number;
  level: VisibilityLevel;
}

/**
 * What one recompute did.
 *
 * `became` is the whole contract with the renderer: these tiles and no others
 * need repainting, so a board of four thousand instanced prisms is patched by a
 * handful of attribute writes instead of being rebuilt (the M8 hard perf
 * constraint, design-notes Sequencing snapshot).
 *
 * The two counters exist so a test can assert the *shape* of the work rather
 * than a wall-clock time that a loaded CI box would make a liar of. `sources`
 * is how many eyes were flooded, `touched` how many tiles those floods asked
 * about — bounded by `sources × maxSightArea` by construction.
 */
export interface VisibilityDelta {
  became: VisibilityChange[];
  sources: number;
  touched: number;
}

// --- accessors --------------------------------------------------------------

/** A fresh, wholly-unexplored grid: one slot per tile, exactly like `tileOwner`. */
export function newVisibilityGrid(tileCount: number): number[] {
  return new Array<number>(tileCount).fill(HIDDEN);
}

/**
 * Re-sizes every seat's grid to the board it is now looking at, blanking it, and
 * forgets every city sighting.
 *
 * For the one case that cannot be handled any other way: the board was
 * *replaced* under a live state. That is not something the game does — a map is
 * generation output, made once and never swapped — but it is exactly what a test
 * fixture does when it wants a flat grassland to reason about instead of a
 * generated continent, and a grid sized for the old map would index off the end
 * of the new one.
 *
 * Blanking rather than remapping is the only honest answer: tile *index* means
 * nothing across two different boards, so "what did this empire explore" has no
 * translation. Whoever swapped the map is starting a new world.
 */
export function resetVisibility(state: GameState): void {
  state.visibility = state.players.map(() => newVisibilityGrid(state.map.tiles.length));
  state.citySightings = state.players.map(() => []);
  recomputeAllVisibility(state);
}

/**
 * How this player sees a cell. `hidden` for a player who does not exist and for
 * a cell off the map, which is the honest answer in both cases: there is nothing
 * there to have seen.
 */
export function visibilityAt(
  state: GameState,
  playerId: number,
  col: number,
  row: number,
): VisibilityLevel {
  const grid = state.visibility[playerId];
  if (!grid) return HIDDEN;
  const tile = getTileAt(state.map, col, row);
  if (!tile) return HIDDEN;
  const level = grid[tileIndex(state.map, tile.col, tile.row)];
  return (level ?? HIDDEN) as VisibilityLevel;
}

export function isVisibleTo(
  state: GameState,
  playerId: number,
  col: number,
  row: number,
): boolean {
  return visibilityAt(state, playerId, col, row) === VISIBLE;
}

/** Seen at least once — the level a remembered terrain is drawn at, or better. */
export function isExploredBy(
  state: GameState,
  playerId: number,
  col: number,
  row: number,
): boolean {
  return visibilityAt(state, playerId, col, row) !== HIDDEN;
}

export function isHiddenFrom(
  state: GameState,
  playerId: number,
  col: number,
  row: number,
): boolean {
  return visibilityAt(state, playerId, col, row) === HIDDEN;
}

/** What this player remembers of a city, or `null` if they never saw it. */
export function citySightingOf(
  state: GameState,
  playerId: number,
  cityId: number,
): CitySighting | null {
  for (const sighting of state.citySightings[playerId] ?? []) {
    if (sighting.cityId === cityId) return sighting;
  }
  return null;
}

// --- sight sources ----------------------------------------------------------

/**
 * How far this unit sees from where it is standing.
 *
 * Its type's own `sight`, plus `visibility.hillsBonus` for high ground. The
 * bonus is asked of the tile rather than of the unit because it is a fact about
 * the ground: the same warrior sees further up a hill and no further at all in a
 * forest, which is the only elevation rule this game has and the same one
 * `los.ts` refuses to grow a second half of.
 */
export function sightOf(map: GameMap, unit: Unit, state?: GameState): number {
  const base = unitDef(unit.type).sight;
  const tile = getTileAt(map, unit.col, unit.row);
  const ground = base + (tile?.hills ? VIS.hillsBonus : 0);
  // The empire's law, through the one evaluator for a sight radius — Far Runners
  // and Master of Maps land here and nowhere else, so the fog, the archers' line
  // of sight and the sleeper's own eyes all agree about how far a piece sees.
  // Floored at 1: a blind unit is not a card, it is a bug.
  if (!state) return ground;
  return Math.max(1, ground + cardUnitStat(state, unit, 'sight'));
}

/** One eye: where it stands and how far it reaches. */
export interface SightSource {
  tile: Tile;
  radius: number;
}

/**
 * Every eye this player has, in state order — units first, then cities.
 *
 * Order is part of the answer even though the result is a set of tiles: a test
 * that reads `sources` wants a number it can reproduce, and iterating
 * `state.units` and `state.cities` (never a Map, never a Set) is the same
 * discipline every outcome in this simulation is held to.
 *
 * A city's *owned* tiles are not here. They are visible unconditionally rather
 * than by line of sight — you do not need to see round a mountain to know what
 * is happening in your own territory — so they are added by the flood itself.
 */
export function sightSources(state: GameState, playerId: number): SightSource[] {
  const sources: SightSource[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const tile = getTileAt(state.map, unit.col, unit.row);
    if (!tile) continue;
    sources.push({ tile, radius: sightOf(state.map, unit, state) });
  }
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const tile = getTileAt(state.map, city.col, city.row);
    if (!tile) continue;
    // Militia Levies' watchtowers, through the same hook a unit's sight uses.
    // Folded here rather than added to `citySight` in the rules, because the
    // rules table is what a city sees and this is what *this empire's* cities
    // see.
    sources.push({
      tile,
      radius: Math.max(
        1,
        VIS.citySight +
          foldCityStat(cardCityStat(state, city, 'sight')) +
          // And whatever the town has *built* that watches, through the same
          // hook. Two tables, one radius — see `buildingEffects.ts`.
          foldBuildingCityStat(buildingCityStat(city, 'sight')),
      ),
    });
  }
  return sources;
}

// --- the recompute ----------------------------------------------------------

/**
 * Recomputes one player's *visible* set from scratch and folds it into their
 * explored set, reporting exactly which tiles changed level.
 *
 * From scratch rather than incrementally, and that is a decision rather than a
 * shortcut. An incremental "un-see the disc you left, see the disc you entered"
 * has to be right about every source that overlaps both, and the failure mode is
 * a permanently-lit tile nobody is standing near — a bug that survives for
 * fifty turns and is impossible to attribute. A flood is `O(sources × r²)`,
 * which for the largest empire this game can produce is a few thousand tile
 * visits, and it cannot drift.
 *
 * Returns the delta the renderer patches with. Nothing here touches the board;
 * the caller decides who is looking.
 */
export function recomputeVisibility(state: GameState, playerId: number): VisibilityDelta {
  const grid = state.visibility[playerId];
  const empty: VisibilityDelta = { became: [], sources: 0, touched: 0 };
  if (!grid) return empty;

  const { map } = state;
  // One byte per tile, thrown away at the end of the call. Cheaper than a Set of
  // boxed integers and — unlike a Set — it cannot leak iteration order into the
  // result, because the sweep below reads it by index.
  const lit = new Uint8Array(map.tiles.length);
  let touched = 0;

  const sources = sightSources(state, playerId);
  for (const source of sources) {
    const origin = tileHex(source.tile);
    for (const tile of mapRange(map, origin, source.radius)) {
      touched += 1;
      const index = tileIndex(map, tile.col, tile.row);
      if (lit[index]) continue;
      // The endpoints are excluded from the line, so a mountain never blocks
      // itself: the ridge is seen and the ground behind it is not.
      if (!hasLineOfSight(map, source.tile, tile)) continue;
      lit[index] = 1;
    }
  }

  // Owned ground, unconditionally. Read through the claim radius rather than by
  // scanning `tileOwner` end to end, so the cost follows the empire's cities and
  // not the size of the map.
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const centre = getTileAt(map, city.col, city.row);
    if (!centre) continue;
    for (const tile of mapRange(map, tileHex(centre), CITIES.claimRadius)) {
      const index = tileIndex(map, tile.col, tile.row);
      touched += 1;
      if (state.tileOwner[index] === city.id) lit[index] = 1;
    }
  }

  const became: VisibilityChange[] = [];
  for (let index = 0; index < grid.length; index++) {
    const before = grid[index] ?? HIDDEN;
    // Explored never shrinks: the floor under a tile that has stopped being
    // watched is `explored`, never `hidden`.
    const after = lit[index] ? VISIBLE : before === HIDDEN ? HIDDEN : EXPLORED;
    if (after === before) continue;
    grid[index] = after;
    const tile = map.tiles[index]!;
    became.push({ col: tile.col, row: tile.row, level: after as VisibilityLevel });
  }

  updateCitySightings(state, playerId, lit);
  recordMeetings(state, playerId, lit);
  return { became, sources: sources.length, touched };
}

/** Recomputes for every seat. The turn-resolution hammer; see `turn.ts`. */
export function recomputeAllVisibility(state: GameState): void {
  for (const player of state.players) recomputeVisibility(state, player.id);
}

/**
 * Recomputes for a named handful of seats, ignoring ids that are not players.
 *
 * What the combat path calls: an attack can change what the attacker, the
 * defender and — when a town changes hands — its old owner can all see, and
 * spelling the set out at the call site is cheaper and more honest than
 * refreshing twelve empires because two of them fought.
 */
export function recomputeVisibilityFor(
  state: GameState,
  playerIds: Iterable<number>,
): void {
  const done = new Set<number>();
  for (const id of playerIds) {
    if (done.has(id)) continue;
    done.add(id);
    if (state.visibility[id]) recomputeVisibility(state, id);
  }
}

/**
 * Folds what is visible right now into this player's memory of cities.
 *
 * Three rules, and each one is a thing the board has to be able to draw:
 *
 *   · a city standing on a currently-visible tile is (re)recorded, so a town
 *     that changed hands under watch is remembered under its new flag.
 *   · a remembered city whose *remembered site* is currently visible and has no
 *     city on it any more is forgotten — the player is looking at the empty
 *     ground and would otherwise keep a banner over it forever.
 *   · everything else is left exactly as it was. Memory is not refreshed by
 *     absence, only by sight.
 *
 * The list is kept sorted by city id, which is founding order, so two states
 * that remember the same things serialise identically.
 */
function updateCitySightings(state: GameState, playerId: number, lit: Uint8Array): void {
  const { map } = state;
  const previous = state.citySightings[playerId] ?? [];
  const kept: CitySighting[] = [];

  for (const sighting of previous) {
    const site = getTileAt(map, sighting.col, sighting.row);
    if (!site) continue;
    if (!lit[tileIndex(map, site.col, site.row)]) {
      kept.push(sighting);
      continue;
    }
    // The site is under the player's eye: believe what is actually there.
    const standing = cityStandingAt(state, sighting.col, sighting.row);
    if (standing && standing.id === sighting.cityId) kept.push(sighting);
  }

  const byId = new Map<number, CitySighting>();
  for (const sighting of kept) byId.set(sighting.cityId, sighting);
  for (const city of state.cities) {
    const tile = getTileAt(map, city.col, city.row);
    if (!tile) continue;
    if (!lit[tileIndex(map, tile.col, tile.row)]) continue;
    byId.set(city.id, {
      cityId: city.id,
      col: city.col,
      row: city.row,
      name: city.name,
      ownerId: city.ownerId,
    });
  }

  // Sorted by id rather than emitted in Map order: `Map` preserves insertion,
  // and insertion here depends on which entries survived — which is exactly the
  // kind of order that must never reach a snapshot.
  state.citySightings[playerId] = [...byId.values()].sort((a, b) => a.cityId - b.cityId);
}

/**
 * Folds what is visible right now into this player's memory of **who they have
 * met** (`Player.metSeats`; user, 2026-09-04, schema 64).
 *
 * The third thing a recompute remembers, beside the explored grid and the city
 * memory, and it is here for their reason: `lit` is the one honest answer to
 * "what can this seat see this instant", and a meeting is exactly that answer
 * caught once and kept. Every mover in the game ends inside a recompute
 * (`arriveOnTile`, the combat path, the turn's own sweep), so hanging the
 * register here is what makes it impossible to add a way to move a unit that
 * quietly skips an introduction.
 *
 * Two ways to meet, and each is a thing the player can point at on their chart:
 *
 *   · **a piece of theirs under this seat's eye** — the sighting that used to
 *     lapse the moment the column walked on, and the whole reason this is
 *     stored;
 *   · **their ground under this seat's eye** — swept through the foreign towns'
 *     claim radii rather than along `tileOwner` end to end, exactly as the owned
 *     -ground pass above is, so the cost follows the world's cities and not the
 *     size of the map.
 *
 * Never removes an id, and never writes one for the wild in either direction
 * (the field's docblock says why). Sorted on the way in, so two seats met on one
 * sweep serialise in seat order rather than in visiting order.
 */
function recordMeetings(state: GameState, playerId: number, lit: Uint8Array): void {
  const seat = state.players[playerId];
  if (!seat || seat.barbarian) return;
  const met = seat.metSeats;

  // **Everybody already met costs nothing.** A recompute runs on every step of
  // every unit, and by the middle of a game this sweep would otherwise walk the
  // unit list and every foreign town's claim to learn nothing at all. Counted
  // here rather than asked of `realPlayers`, which lives in `state.ts` — that
  // module imports this one, and a value import back would be a runtime cycle
  // (`test/mapgen/moduleCycles.test.ts`).
  let others = 0;
  for (const player of state.players) {
    if (player.barbarian || player.id === playerId) continue;
    others += 1;
  }
  if (met.length >= others) return;

  const introduce = (otherId: number): void => {
    if (otherId === playerId) return;
    const other = state.players[otherId];
    if (!other || other.barbarian) return;
    if (met.includes(otherId)) return;
    met.push(otherId);
    met.sort((a, b) => a - b);
  };

  const { map } = state;
  for (const unit of state.units) {
    if (unit.ownerId === playerId) continue;
    if (!lit[tileIndex(map, unit.col, unit.row)]) continue;
    introduce(unit.ownerId);
  }
  for (const city of state.cities) {
    if (city.ownerId === playerId) continue;
    if (met.includes(city.ownerId)) continue;
    const centre = getTileAt(map, city.col, city.row);
    if (!centre) continue;
    for (const tile of mapRange(map, tileHex(centre), CITIES.claimRadius)) {
      const index = tileIndex(map, tile.col, tile.row);
      if (!lit[index]) continue;
      if (state.tileOwner[index] !== city.id) continue;
      introduce(city.ownerId);
      break;
    }
  }
}

/** The city standing on a cell, by linear scan. Cities are few. */
function cityStandingAt(state: GameState, col: number, row: number): City | null {
  for (const city of state.cities) {
    if (city.col === col && city.row === row) return city;
  }
  return null;
}

// --- reporting --------------------------------------------------------------

/** How many tiles a disc of `radius` holds: the closed form `3r² + 3r + 1`. */
export function discArea(radius: number): number {
  return 3 * radius * radius + 3 * radius + 1;
}

/**
 * The furthest any single eye in the game can reach: the widest `sight` in the
 * roster, on high ground, or a city's reach if that is somehow larger.
 *
 * Read off the data rather than written down, because a bound spelled out in a
 * test is a second copy of the rule that stops being true the day somebody gives
 * a unit a spyglass.
 */
export function maxSightRadius(): number {
  let radius = VIS.citySight;
  for (const id of UNIT_TYPE_IDS) {
    radius = Math.max(radius, unitDef(id).sight + VIS.hillsBonus);
  }
  return radius;
}

/** The largest disc any single source can light, in tiles. The harness's bound. */
export function maxSightArea(): number {
  return discArea(maxSightRadius());
}

/**
 * The hex distance between two cells, allowed to travel round the seam.
 *
 * `wrappedDistance` in `map.ts` is the same arithmetic and is what everything
 * in the simulation uses; this is here so the fog tests can bound a delta
 * against the tile a unit moved from without importing half the map module.
 */
export function seamDistance(map: GameMap, a: Hex, b: Hex): number {
  let best = Infinity;
  for (let k = -1; k <= 1; k++) {
    best = Math.min(best, hexDistance(a, { q: b.q + k * map.width, r: b.r }));
  }
  return best;
}
