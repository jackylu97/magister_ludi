/**
 * The empire's own coin: what a treasury gains and loses every turn **beyond
 * what its cities bank**.
 *
 * `routeYields.ts`' sibling and the second half of the same extraction
 * (2026-08-28). `collectYields` banks this figure once per player after every
 * town has collected, so `cities.ts` has to be able to ask for it — and while it
 * lived in `trade.ts`, which reads `cities.ts` for the capital and the tile
 * owner, asking for it closed a load-time cycle between the two largest modules
 * in the simulation. Nothing here imports `cities.ts` or `trade.ts`.
 *
 * Two of the four lines are trade's and two are maintenance's, which is exactly
 * why the fold belongs to neither: `upkeep.ts` answers what an army and a set of
 * institutions cost and this module answers what the roads between the towns are
 * worth, and `explainEmpireGold` is the one list the per-turn figure is the fold
 * of. `trade.ts` re-exports these names, so a screen that reads the ledger and
 * the routes together still has one import site.
 *
 * The flood fill (`connectedCities`) is the connection line's whole basis — a
 * road is only worth coin when it reaches the capital — and it lived here until
 * the tree re-cut of 2026-09-02 gave Empire-Building a *contentment* for a
 * joined city as well as a coin. That put a second reader in `statecraft.ts`,
 * which this module imports, so the fill moved down to the leaf both of us can
 * see (`roads.ts` — the road is what it is asking about) and is re-exported from
 * here. One implementation, one import site, no cycle.
 */

import { type Tile, getTileAt, neighborTiles, tileHex, tileIndex } from './map';
import { RULES } from './rulesData';
import type { GameState } from './state';
// The connection fill lives in `roads.ts` — a leaf — because `statecraft.ts`
// needs it too (Empire-Building's contented cities) and this module reads
// `statecraft.ts`. Re-exported below, so a screen that reads the ledger and the
// connections together still has one import site.
import { type ConnectedCity, connectedCities } from './roads';
import { cardAmplifier, cardAmplifierFlat, cardBehaviorRule } from './statecraft';
import { explainBuildingUpkeep, explainUnitUpkeep, explainUnitUpkeepRebate } from './upkeep';

export { type ConnectedCity, connectedCities };

const TRADE = RULES.trade;

/**
 * How many road hexes this empire laid **and pays for** — the count maintenance
 * is charged on.
 *
 * `Tile.roadFree` is skipped, which is The Founders' Road's third clause (the
 * user's ruling of 2026-08-28: *"the roads are maintenance-free"*). It is
 * subtracted **here**, in the count, rather than as a credit line in
 * `explainEmpireGold`, because the ledger's road line prints the number it is
 * charging on ("Road maintenance · 12 hexes") and a count that included hexes
 * nobody is billed for would be a line whose own figure did not explain it.
 * Free hexes are roads in every other respect — `stepCost` prices them, and
 * `connectedCities` fills across them — which is the point of the doctrine.
 *
 * An **index sweep** over `map.tiles` rather than a walk of anything with
 * coordinates, for `tileOwnerField`'s stated reason: this runs once per empire
 * per turn over four thousand hexes, and a coordinate lookup per hex is the
 * shape that turned a forty-city resolution into a profile.
 */
export function roadsBuiltBy(state: GameState, playerId: number): number {
  // **The Imperial Post** (the tree pass of 2026-08-30): roads near a town cost
  // nothing to keep. A clause on the *count* rather than on the price, which is
  // what keeps `explainEmpireGold` four lines — and it is hoisted once per
  // sweep, `zocField`'s bargain, because the alternative is a walk of the city
  // list per hex over four thousand hexes.
  const posted = cardBehaviorRule(state, playerId, 'freeCityRoads')
    ? postedHexes(state, playerId)
    : null;
  let count = 0;
  for (let index = 0; index < state.map.tiles.length; index++) {
    const tile = state.map.tiles[index];
    if (tile.road !== playerId || tile.roadFree === true) continue;
    if (posted?.has(index) === true) continue;
    count += 1;
  }
  return count;
}

/**
 * The hexes within `rules.trade.postRange` of one of this empire's own cities,
 * by tile index — the ground The Imperial Post keeps for nothing.
 *
 * By index because `roadsBuiltBy` is an index sweep and already holds the
 * address, `tileOwnerField`'s reading exactly. Built from the city list rather
 * than from the borders on purpose: what the Post pays for is the *road home*,
 * and a town's third ring is not always its own.
 *
 * Its lifetime is one sweep, for `tileOwnerField`'s reason — a set that outlived
 * its loop would answer with a city list the state has moved past.
 */
function postedHexes(state: GameState, playerId: number): ReadonlySet<number> {
  const { map } = state;
  const near = new Set<number>();
  const range = Math.max(0, Math.floor(TRADE.postRange));
  // A ring walk **out of each town** rather than a distance test per hex: the
  // reach is three, so this is forty hexes a city, where the other reading is
  // four thousand hexes times the city list — the shape the 2026-08-28 profile
  // pass took out of `hasResource`. `mapNeighbors` is the same walk every other
  // ring in the game uses, so a road across the east–west seam is posted too.
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const start = getTileAt(map, city.col, city.row);
    if (!start) continue;
    let ring: Tile[] = [start];
    near.add(tileIndex(map, start.col, start.row));
    for (let step = 0; step < range; step++) {
      const next: Tile[] = [];
      for (const tile of ring) {
        for (const neighbour of neighborTiles(map, tileHex(tile))) {
          const index = tileIndex(map, neighbour.col, neighbour.row);
          if (near.has(index)) continue;
          near.add(index);
          next.push(neighbour);
        }
      }
      ring = next;
    }
  }
  return near;
}

/** One labelled line of empire-scale gold. See `explainEmpireGold`. */
export interface TradeGoldLine {
  /** "City connections · 4 cities", "Unit maintenance · 7 units". */
  source: string;
  /** Signed: connections pay, maintenance costs. */
  gold: number;
}

/**
 * What this empire's treasury gains and loses every turn **beyond what its
 * cities bank**, as the ordered list the figure is the fold of (rule 5).
 *
 * **Four** lines since the maintenance ruling (the user, 2026-08-28), and the
 * shape of each is a ruling of its own:
 *
 *   · **City connections**, as *one* line for the total rather than one per city
 *     ("City connections · 4 cities +11💰"). The per-city figures are still
 *     `connectedCities`' answer, for a hover that wants them — the fold is a
 *     presentation decision and the list is the truth;
 *   · **Road maintenance**, one negative line, charged only on the roads this
 *     empire's own caravans laid (`Tile.road` carries the builder's seat);
 *   · **Unit maintenance**, one negative line for the whole army, the fold of
 *     `explainUnitUpkeep` (`upkeep.ts`) which is the per-piece list a hover
 *     prints;
 *   · **Building maintenance**, the same one grade over, folding
 *     `explainBuildingUpkeep`.
 *
 * It was called `explainTradeGold` until the last two arrived — the alias is
 * gone now that the interface has caught up — and the rename is the note that
 * function carried: *"buildings and units are the obvious next
 * two, and they join this fold rather than opening a second one."* They did, and
 * once they had, "trade" was no longer the name of what this answers. The rename
 * is why the *file* followed a fortnight later: two of the four lines are
 * trade's and two are maintenance's, so the fold belongs to neither module and
 * has one of its own. `upkeep.ts` is a leaf this imports rather than a second
 * ledger, and this file is a leaf `cities.ts` imports for the same reason.
 *
 * Banked once per player by `collectYields`, after every city has collected —
 * the same seam `empireResourceYields` lands on, and for the same reason: none
 * of it belongs to a town. The two maintenance lines in particular are
 * deliberately **not** city yields: a garrison is not the town it is standing
 * in, and charging it there would put an army inside Entry XVII's staging, where
 * a happy empire would pay less for the same soldiers.
 *
 * The wild is charged nothing, which `explainUnitUpkeep` refuses at the seat
 * (see `seatPays`) rather than this function checking twice.
 */
export function explainEmpireGold(state: GameState, playerId: number): TradeGoldLine[] {
  const lines: TradeGoldLine[] = [];

  const connected = connectedCities(state, playerId);
  // **Nanaivandak's road home**, folded into the line's own figure rather than
  // multiplied afterwards — rule 5 for a treasury, exactly as `routeYields` is
  // rule 5 for a caravan. The flat step is *per connected city* (that is what a
  // connection's gold is quoted in) and the share is taken of the total the flat
  // has already reached, which is `CardEffectAmplifierEffect`'s stated order.
  const perCity = cardAmplifierFlat(state, playerId, 'connectionYields');
  const share = cardAmplifier(state, playerId, 'connectionYields');
  let connectionGold = 0;
  for (const entry of connected) connectionGold += entry.gold + perCity;
  if (share !== 0) connectionGold = Math.floor((connectionGold * (100 + share)) / 100);
  if (connectionGold !== 0) {
    const count = connected.length;
    lines.push({
      source: `City connections · ${count} ${count === 1 ? 'city' : 'cities'}`,
      gold: connectionGold,
    });
  }

  const roads = roadsBuiltBy(state, playerId);
  const per = Math.max(1, Math.floor(TRADE.roadsPerMaintenance));
  const upkeep = Math.floor(roads / per);
  if (upkeep > 0) {
    lines.push({ source: `Road maintenance · ${roads} hexes`, gold: -upkeep });
  }

  // The two new lines, each a *count* and a total rather than a page of pieces —
  // the connections line's shape exactly, and for its reason: the per-item lists
  // are still `upkeep.ts`' answer for a hover that wants them.
  const units = explainUnitUpkeep(state, playerId);
  if (units.length > 0) {
    let gold = 0;
    for (const line of units) gold += line.gold;
    lines.push({
      source: `Unit maintenance · ${units.length} ${units.length === 1 ? 'unit' : 'units'}`,
      gold: -gold,
    });
  }

  // What the law gives back on that payroll — Tyranny's, The Standing Army's.
  // Its **own lines**, right after the charge they reduce, so a player reads the
  // army's price and then the reason it is lower. Positive, because the fold is
  // signed and this one pays.
  for (const rebate of explainUnitUpkeepRebate(state, playerId)) {
    lines.push({ source: rebate.source, gold: rebate.gold });
  }

  const buildings = explainBuildingUpkeep(state, playerId);
  if (buildings.length > 0) {
    let gold = 0;
    for (const line of buildings) gold += line.gold;
    lines.push({
      source:
        `Building maintenance · ${buildings.length} ` +
        `${buildings.length === 1 ? 'building' : 'buildings'}`,
      gold: -gold,
    });
  }

  return lines;
}

/** The fold of `explainEmpireGold`, and the only sum of one. */
export function empireGold(state: GameState, playerId: number): number {
  let total = 0;
  for (const line of explainEmpireGold(state, playerId)) total += line.gold;
  return total;
}
