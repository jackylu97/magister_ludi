/**
 * **Which site each settler of a seat is for, and which sites are still free**
 * (bot batch BP10, `docs/flags.md` (ooooooo), the bullet "BP10").
 *
 * The user, 2026-11-15: *"aren't we having the bot look at it's available settle
 * locations to determine whether to make a settler? How is it not sending those
 * to settle if it already chose a spot"*. BP10's trace (the plan file's section
 * "BP10") found that the bot read the sites in two places that did not know
 * about each other:
 *
 *   - the build arm priced a settler by one site for the whole empire, read once
 *     a turn, so every town that chose a build in that turn saw the same open
 *     site, and several towns started a settler for it;
 *   - the settler, once built, chose the best hex within its own search radius
 *     with no notion of where the seat's other settlers were going. Several
 *     marched to one site, the first founded, and the rest lost it. A settler
 *     that was asked again on the way chose again from where it then stood, so
 *     its target moved from turn to turn.
 *
 * This leaf is the one reading both arms now share. A **claim** is a site a
 * settler of the seat is for:
 *
 *   1. a settler marching to a legal site claims the end of its march. When two
 *      marches end within the spacing rule of each other, the settler first in
 *      unit order keeps its claim and the other has none;
 *   2. an awake settler with no claim (just raised, or its site was lost)
 *      claims the free site nearest to it within the search radius, else the
 *      free site nearest to it among the seat's sites. A sleeping settler claims
 *      nothing: it sleeps because its own arm found no site for it;
 *   3. a settler in a town's queue claims the free site nearest to that town
 *      within the search radius.
 *
 * A site is **free** when it is legal now (`foundingErrorAt`) and at least
 * `minCitySpacing` hexes from every claim, because a town founded on a claim
 * would make any nearer site illegal. The seat's sites are the legal hexes
 * within the search radius of its towns, read once a sitting
 * (`ValueContext.sites`) and asked again for their legality where used, so a
 * town founded during the turn is seen.
 *
 * Nothing here is stored. Every claim is derived from the board: the units'
 * marches and the towns' queues.
 */

import { foundingErrorAt } from '../sim/cities';
import { type Tile, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../sim/map';
import { RULES } from '../sim/rulesData';
import type { City, GameState, Unit } from '../sim/state';
import { unitDef } from '../sim/unitData';

/** A legal site near the seat's towns, as the sitting read it. */
export interface FoundingSite {
  tile: Tile;
  /** Hexes to the nearest town of the seat. */
  distance: number;
}

/** A site a settler of the seat is for. */
export interface SiteClaim {
  col: number;
  row: number;
  /** Who it is for: a settler marching there, a settler standing, or a town's queue. */
  by: 'march' | 'standing' | 'queued';
  /** The settler, for a march or a standing settler. */
  unitId: number | null;
  /** The town, for a queued settler. */
  cityId: number | null;
}

const SPACING = RULES.cities.minCitySpacing;

/**
 * The legal sites within `radius` of any town of the seat, nearest to a town
 * first, then in map order. The first is the expansion chain's site
 * (`nextTownChain`, `bot.ts`).
 */
export function foundingSites(state: GameState, playerId: number, radius: number): FoundingSite[] {
  // `null` marks a hex already found illegal, so a hex in reach of two towns is
  // asked once.
  const seen = new Map<number, FoundingSite | null>();
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const centre = getTileAt(state.map, city.col, city.row);
    if (centre === undefined) continue;
    const from = tileHex(centre);
    for (const tile of mapRange(state.map, from, radius)) {
      const index = tileIndex(state.map, tile.col, tile.row);
      const known = seen.get(index);
      if (known === null) continue;
      const distance = wrappedDistance(state.map, from, tileHex(tile));
      if (known !== undefined) {
        if (distance < known.distance) known.distance = distance;
        continue;
      }
      seen.set(index, foundingErrorAt(state, playerId, tile) === null ? { tile, distance } : null);
    }
  }
  const sites: FoundingSite[] = [];
  for (const site of seen.values()) if (site !== null) sites.push(site);
  return sites.sort(
    (a, b) =>
      a.distance - b.distance ||
      tileIndex(state.map, a.tile.col, a.tile.row) - tileIndex(state.map, b.tile.col, b.tile.row),
  );
}

/** Where a march ends, or `null` for a piece carrying none. */
function marchEndOf(unit: Unit): { col: number; row: number } | null {
  const path = unit.path;
  if (path === undefined || path.length === 0) return null;
  return path[path.length - 1] ?? null;
}

/** True when a town founded on a claim would leave this hex legal. */
function clearOf(state: GameState, tile: Tile, claims: readonly SiteClaim[]): boolean {
  const here = tileHex(tile);
  for (const claim of claims) {
    const there = getTileAt(state.map, claim.col, claim.row);
    if (there === undefined) continue;
    if (wrappedDistance(state.map, here, tileHex(there)) < SPACING) return false;
  }
  return true;
}

/**
 * The free site nearest to `from`: within `radius` of it, or, with `radius`
 * `null`, anywhere in `sites`. Ties go to map order. `null` when none is free.
 */
export function nearestFreeSite(
  state: GameState,
  playerId: number,
  sites: readonly FoundingSite[],
  claims: readonly SiteClaim[],
  from: Tile,
  radius: number | null,
): Tile | null {
  const here = tileHex(from);
  let best: { tile: Tile; distance: number; index: number } | null = null;
  for (const site of sites) {
    const distance = wrappedDistance(state.map, here, tileHex(site.tile));
    if (radius !== null && distance > radius) continue;
    const index = tileIndex(state.map, site.tile.col, site.tile.row);
    if (best !== null && (distance > best.distance || (distance === best.distance && index > best.index))) continue;
    if (!clearOf(state, site.tile, claims)) continue;
    // Asked again of the live board: a town founded since the sitting read the
    // sites makes the ground near it illegal.
    if (foundingErrorAt(state, playerId, site.tile) !== null) continue;
    best = { tile: site.tile, distance, index };
  }
  return best?.tile ?? null;
}

/**
 * **Every site a settler of this seat is for**, in the order the module
 * docblock gives: marches, then awake settlers with no march, then queued
 * settlers, each in the board's own order (units, then towns and their queues).
 */
export function siteClaims(
  state: GameState,
  playerId: number,
  sites: readonly FoundingSite[],
  radius: number,
): SiteClaim[] {
  const claims: SiteClaim[] = [];
  const standing: Unit[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId || unitDef(unit.type).foundsCity !== true) continue;
    const end = marchEndOf(unit);
    const tile = end === null ? undefined : getTileAt(state.map, end.col, end.row);
    if (tile !== undefined && foundingErrorAt(state, playerId, tile) === null && clearOf(state, tile, claims)) {
      claims.push({ col: tile.col, row: tile.row, by: 'march', unitId: unit.id, cityId: null });
      continue;
    }
    if (unit.sleeping !== true) standing.push(unit);
  }
  for (const unit of standing) {
    const here = getTileAt(state.map, unit.col, unit.row);
    if (here === undefined) continue;
    const site =
      nearestFreeSite(state, playerId, sites, claims, here, radius) ??
      nearestFreeSite(state, playerId, sites, claims, here, null);
    if (site !== null) claims.push({ col: site.col, row: site.row, by: 'standing', unitId: unit.id, cityId: null });
  }
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const centre = getTileAt(state.map, city.col, city.row);
    if (centre === undefined) continue;
    for (const item of city.queue) {
      if (item.kind !== 'unit' || unitDef(item.id).foundsCity !== true) continue;
      const site = nearestFreeSite(state, playerId, sites, claims, centre, radius);
      if (site !== null) claims.push({ col: site.col, row: site.row, by: 'queued', unitId: null, cityId: city.id });
    }
  }
  return claims;
}

/**
 * **The site a new settler raised in this town would be for**: the free site
 * nearest to the town within `radius`, after every claim of the seat. `null`
 * when every legal site in reach of the town already has a settler for it.
 */
export function freeSiteForTown(
  state: GameState,
  city: City,
  sites: readonly FoundingSite[],
  radius: number,
): Tile | null {
  const centre = getTileAt(state.map, city.col, city.row);
  if (centre === undefined) return null;
  const claims = siteClaims(state, city.ownerId, sites, radius);
  return nearestFreeSite(state, city.ownerId, sites, claims, centre, radius);
}

/** The claims of every settler of the seat but this one, for its own arm. */
export function claimsOfOthers(claims: readonly SiteClaim[], unitId: number): SiteClaim[] {
  return claims.filter((claim) => claim.unitId !== unitId);
}

/** This settler's own march claim, or `null` when it holds none. */
export function marchClaimOf(claims: readonly SiteClaim[], unitId: number): SiteClaim | null {
  return claims.find((claim) => claim.by === 'march' && claim.unitId === unitId) ?? null;
}

/** True when a town on this hex would leave every claim in `claims` legal. */
export function siteIsFree(state: GameState, tile: Tile, claims: readonly SiteClaim[]): boolean {
  return clearOf(state, tile, claims);
}
