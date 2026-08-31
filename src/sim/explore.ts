/**
 * Auto-explore: the standing order that aims itself (user, 2026-08-30 — "an
 * auto-explore button on all military units + the scout").
 *
 * A leaf, like `roads.ts`: it reads the map, the searches and the fog, and
 * nothing in `src/sim/` imports it except the two places the order lives —
 * `commands.ts` (the `setAutoExplore` verb aims a fresh explorer at once) and
 * `turn.ts` (the `marchExplorers` phase re-aims every idle one, directly
 * before `spendLeftoverMovement` spends what it set).
 *
 * The shape of the thing is `marchTraders`' exactly: this module decides
 * *where* a ranging piece is going and never how far it gets. The path it
 * writes is an ordinary standing order — walked by `advanceAlongPath` through
 * `arriveOnTile` per step, so a ruin on the way is claimed and a camp is burnt
 * out precisely as they would be on any other march — and the flag itself
 * (`Unit.autoExplore`, presence is the state) is cleared by any other accepted
 * order in `applyCommand`'s one seam, never by anything here except the search
 * coming back empty.
 */

import { hasLineOfSight } from './los';
import { type GameMap, type Tile, getTile, getTileAt, mapNeighbors, mapRange, tileHex, tileIndex } from './map';
import {
  type Cell,
  canStopOn,
  canTransit,
  findPath,
  moveProfile,
  stepCost,
  zocField,
} from './pathfind';
import { RULES } from './rulesData';
import type { GameState, Unit } from './state';
import { isCombatant, isExplorer, unitDef } from './unitData';
import { isExploredBy, sightOf } from './visibility';

/**
 * A piece whose auto-explore ran out of world, reported so the interface can
 * say "your scout has seen all it can reach" — `RouteEndReport`'s shape one
 * verb over, and rides `TurnReport.exploreEnded` for its reason: by the time
 * the resolution returns the flag is simply gone, and no diff of two boards
 * can say the search came back empty rather than never having run.
 */
export interface ExploreEndReport {
  unitId: number;
  ownerId: number;
}

/** What the bounded search found, and what it cost — see `exploreSearch`. */
export interface ExploreSearch {
  /**
   * The nearest known, unclaimed discovery the piece can stand on, or —
   * failing that — the nearest revealing hex; `null` if neither exists
   * within the bound.
   */
  target: Cell | null;
  /** Tiles judged before the answer, for the bound's own test. */
  examined: number;
}

/**
 * Why this unit cannot be told to range ahead, or `null` when it can.
 *
 * `sleepError`'s split and the same guarantee: the unit sheet's button is
 * greyed by exactly the rule the reducer refuses with, so the two cannot
 * disagree. One clause, and it is asked of the *kind* rather than of a name
 * (`isCombatant`, `isExplorer` — never `"scout"`): a piece that can neither
 * fight nor cover unknown ground cheaply is a piece ranging ahead into
 * somebody's spear for nothing it can use.
 */
export function autoExploreError(unit: Unit): string | null {
  const def = unitDef(unit.type);
  if (!isCombatant(def) && !isExplorer(def)) {
    return `A ${def.name} cannot range ahead — only soldiers and scouts explore`;
  }
  return null;
}

/** The on-map neighbours of `tile` — `pathfind.ts`'s own reading, mirrored. */
function neighborsOf(map: GameMap, tile: Tile): Tile[] {
  const result: Tile[] = [];
  for (const hex of mapNeighbors(map, tileHex(tile))) {
    const neighbor = getTile(map, hex);
    if (neighbor) result.push(neighbor);
  }
  return result;
}

/**
 * Would this piece, standing on `tile`, see at least one hex its owner has
 * never explored?
 *
 * The piece's **own** eyes, exactly as `wakeSleepers` reads them: `sightOf`
 * from the candidate hex (so a hilltop is worth more, and the empire's law
 * counts), then `hasLineOfSight` per hex — the same two the fog flood itself
 * asks (`recomputeVisibility`), so a hex this says yes to is a hex arriving
 * would genuinely light.
 */
function revealsAnything(state: GameState, unit: Unit, tile: Tile): boolean {
  // A probe, never a mutation: `sightOf` reads the mover's type, owner and the
  // ground under it, so a spread copy standing on the candidate asks the exact
  // question with nothing on the board moved.
  const probe: Unit = { ...unit, col: tile.col, row: tile.row };
  const radius = sightOf(state.map, probe, state);
  for (const seen of mapRange(state.map, tileHex(tile), radius)) {
    if (isExploredBy(state, unit.ownerId, seen.col, seen.row)) continue;
    if (!hasLineOfSight(state.map, tile, seen)) continue;
    return true;
  }
  return false;
}

/**
 * Does `tile` carry a discovery this owner already knows stands there?
 *
 * `Tile.discovery` can only ever be *removed*, by a unit walking onto it
 * (`claimDiscoveryAt`) — never regenerated, never moved (see the trap in
 * `CLAUDE.md`) — so an explored tile that still carries one in the state is
 * genuinely, currently, still a ruin. `isExploredBy` is the same fog reading
 * `revealsAnything` uses below: EXPLORED or VISIBLE both count, HIDDEN does
 * not — a seat cannot aim at ground it has never seen.
 */
function isKnownDiscovery(state: GameState, ownerId: number, tile: Tile): boolean {
  return tile.discovery !== undefined && isExploredBy(state, ownerId, tile.col, tile.row);
}

/**
 * The nearest tile this unit can stand on that either carries a known,
 * unclaimed discovery, or whose own sight would reveal at least one
 * unexplored hex for its owner — and what finding it cost.
 *
 * A breadth-first search over `stepCost`-legal steps from where the piece
 * stands, **bounded** at `rules.explore.searchLimit` tiles examined: nearness
 * is counted in steps rather than in points, which is what a player means by
 * "the nearest", and the bound is what keeps an idle explorer on a charted
 * continent from running a full-map Dijkstra every resolution. Within one
 * depth, candidates are judged in **tile-index order** — the tie-break every
 * deterministic sweep in this simulation uses — so two equally-near lookouts
 * always resolve the same way in a replay.
 *
 * A known ruin outranks the frontier absolutely, not merely when nearer: it
 * is a certain payoff (renown, a windfall, a great person) while an
 * unexplored hex is only a maybe, so a discovery anywhere inside the bound
 * beats a closer patch of fog. Because that ranking does not fall out of
 * plain nearest-first order, the search cannot return the moment it finds a
 * frontier candidate the way it used to — a nearer-in-index but
 * lower-priority frontier hit has to wait on the rest of the bounded sweep in
 * case a ruin turns up later in it. A discovery hit, by contrast, can still
 * return immediately: the level-by-level, index-tied traversal visits
 * everything nearer first, so the first discovery tile found is already the
 * nearest reachable one and nothing later in the sweep could outrank it.
 *
 * The mover's profile and the zone-of-control field are hoisted once, `findPath`'s
 * bargain; intermediate hexes need only transit (a search may thread between
 * friendly pieces), and only a hex the piece may *stop* on can be the answer.
 */
export function exploreSearch(state: GameState, unit: Unit): ExploreSearch {
  const { map } = state;
  const start = getTileAt(map, unit.col, unit.row);
  if (!start) return { target: null, examined: 0 };

  const mover = moveProfile(state, unit);
  const field = zocField(state, unit.ownerId);
  const limit = RULES.explore.searchLimit;

  const visited = new Uint8Array(map.tiles.length);
  const startIndex = tileIndex(map, start.col, start.row);
  visited[startIndex] = 1;
  let level: number[] = [startIndex];
  let examined = 0;
  // The frontier fallback: the nearest revealing tile seen so far, kept only
  // in case the whole bounded sweep turns up no discovery to prefer over it.
  let frontier: Cell | null = null;

  while (level.length > 0 && examined < limit) {
    // The tie-break: everything at one depth, judged in index order.
    level.sort((a, b) => a - b);
    const next: number[] = [];
    for (const index of level) {
      if (examined >= limit) break;
      examined += 1;
      const tile = map.tiles[index]!;
      if (canStopOn(state, unit, tile, mover)) {
        if (isKnownDiscovery(state, unit.ownerId, tile)) {
          return { target: { col: tile.col, row: tile.row }, examined };
        }
        if (frontier === null && revealsAnything(state, unit, tile)) {
          frontier = { col: tile.col, row: tile.row };
        }
      }
      for (const neighbor of neighborsOf(map, tile)) {
        const at = tileIndex(map, neighbor.col, neighbor.row);
        if (visited[at]) continue;
        if (!canTransit(state, unit, neighbor, mover)) continue;
        if (stepCost(map, tile, neighbor, mover, field) === null) continue;
        visited[at] = 1;
        next.push(at);
      }
    }
    level = next;
  }
  if (frontier !== null) return { target: frontier, examined };
  return { target: null, examined };
}

/** `exploreSearch` without the accounting — the reading every caller wants. */
export function exploreTarget(state: GameState, unit: Unit): Cell | null {
  return exploreSearch(state, unit).target;
}

/**
 * Aims one explorer: finds its target, paths to it, and writes the path as an
 * ordinary standing order. Returns whether there was anywhere to go.
 *
 * The walk is deliberately not here — `startRoute`'s sentence for a piece
 * changing vocation: the pipeline walks what this sets
 * (`spendLeftoverMovement` on the very turn the order is given,
 * `resetMovement` after it), which keeps one implementation of a march and
 * sends every step through `arriveOnTile`.
 */
export function aimExplorer(state: GameState, unit: Unit): boolean {
  const target = exploreTarget(state, unit);
  if (!target) return false;
  const goal = getTileAt(state.map, target.col, target.row);
  if (!goal) return false;
  const path = findPath(state, unit, goal);
  if (!path || path.length === 0) return false;
  unit.path = path.map((cell) => ({ col: cell.col, row: cell.row }));
  return true;
}

/**
 * Aims every auto-exploring unit that stands without a path, and stands down —
 * with a report — every one whose search came back empty.
 *
 * The phase (`turn.ts`), and `marchTraders`' pattern to the letter: called
 * immediately before `spendLeftoverMovement`, walked in `state.units` order,
 * dice never rolled. A piece mid-march is already under orders and is left
 * alone — re-aiming it every turn would throw away a route the board agreed
 * to. The sink is structurally `TurnReport`; taking only the one list keeps
 * this module a leaf.
 */
export function marchExplorers(
  state: GameState,
  report: { exploreEnded: ExploreEndReport[] },
): void {
  for (const unit of state.units) {
    if (unit.autoExplore !== true) continue;
    if (unit.path !== undefined && unit.path.length > 0) continue;
    if (aimExplorer(state, unit)) continue;
    // Nothing within the search's reach would show this piece anything new:
    // the order ends here, and only here — the one writer beside the command.
    delete unit.autoExplore;
    report.exploreEnded.push({ unitId: unit.id, ownerId: unit.ownerId });
  }
}
