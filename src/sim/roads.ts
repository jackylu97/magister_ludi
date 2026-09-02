/**
 * The road, the two occasions that write one, and **what the roads join**.
 *
 * A **leaf**, and that is the whole reason the module exists (2026-08-28). A
 * road is one mark on one field of one tile — `Tile.road`, and its companion
 * `Tile.roadFree` — and answering "who may write it" needs nothing but the hex
 * and the roster. It used to live in `trade.ts` beside the caravan that wears
 * one, which was the right home for the *rule* and the wrong one for the
 * *layering*: `cities.ts` decrees a road at a founding (The Founders' Road) and
 * `trade.ts` already reads `cities.ts`, so the writer sat on the far side of a
 * cycle from one of its two callers. Extracting it costs nothing — this file
 * imports the map's types and the roster and nothing else, so it can never be
 * the far side of anything.
 *
 * **`layRoad` is still the only writer of `Tile.road`.** It simply lives here
 * now. Both occasions come through it, the refusal to repave is still one
 * comparison, and a third way to lay a road calls this function.
 *
 * The **connection fill** (`connectedCities`) moved down here on 2026-09-02 for
 * the same layering reason, one scale up. It answers "which of this empire's
 * towns does the road reach", which was `empireGold.ts`' question alone until
 * the tree re-cut gave Empire-Building a contentment for a joined city — and
 * that put the second reader in `statecraft.ts`, which `empireGold.ts` imports.
 * A helper two modules both need lives in a leaf; this is the leaf, and the
 * question is about roads. `empireGold.ts` re-exports it, so nothing that read
 * it there had to move.
 */

import {
  type GameMap,
  type Tile,
  getTile,
  getTileAt,
  mapNeighbors,
  tileHex,
  tileIndex,
} from './map';
import { RULES } from './rulesData';
import { type City, type GameState, type Unit, capitalCityOf, tileOwnerField } from './state';
import { trades, unitDef } from './unitData';

const TRADE = RULES.trade;

/**
 * Writes `Tile.road`, and is the **only** thing that does.
 *
 * Two occasions reach it — a caravan wearing a highway into the ground
 * (`layRoadUnder`, below, called from `arriveOnTile`) and The Founders' Road
 * decreeing one between two towns (`layFoundingRoad`, `cities.ts`) — which is
 * exactly why the write is a function of its own rather than a line in each: a
 * road is one mark on one field, and the refusal to repave is the rule that
 * keeps maintenance stable whichever occasion asks.
 *
 * `free` writes the second mark, `Tile.roadFree` — *this hex costs its builder
 * nothing to keep* — and it is a **property of the occasion, not of the seat**:
 * a decreed road is free, a worn one is not, and the same empire owns both. Only
 * The Founders' Road passes it today (the user's ruling of 2026-08-28, *"the
 * roads are maintenance-free"*). It is a companion field rather than, say, a
 * sentinel owner id, because free or not a road still has to answer "whose is
 * this to keep" the day something else asks.
 *
 * The refusal to repave is what settles the interaction the ruling implies: a
 * caravan that later walks a decreed hex finds a road already there, returns
 * `false` and writes neither field — so a free road **stays** free, and a road
 * that was already worn does not become free because a doctrine drew a line
 * through it. Whichever mark got there first is the one that stands.
 */
export function layRoad(tile: Tile, ownerId: number, free = false): boolean {
  if (tile.road !== undefined) return false;
  tile.road = ownerId;
  if (free) tile.roadFree = true;
  return true;
}

/**
 * Lays a road under a piece that has come to rest here, when the piece is a
 * **laden caravan** and not otherwise.
 *
 * Called from `arriveOnTile` — the one "a unit came to rest here" seam — on
 * every step of every march, which is why it refuses for itself rather than
 * making that seam ask two questions about a unit type it has no other business
 * with. Both clauses are the rule: a caravan is what wears a highway (`trades`,
 * the roster's own marker, so nothing here compares a type against a name), and
 * it wears one only while it is actually *carrying* a route (`Unit.trade`) — an
 * idle trader parked on a hill is not a trade road.
 *
 * **Or when the piece is a road-builder** (`UnitDef.laysRoad`, the tree pass of
 * 2026-08-30 — the Legionary's "the road is the army, laid down behind it").
 * A second marker rather than a second function, because it is the same
 * sentence: a piece of this kind, come to rest here, paves the hex. It goes
 * through `layRoad` like everything else, so the legion's road and the
 * caravan's are one mark on one field and the maintenance count cannot tell
 * them apart — which is the point.
 */
export function layRoadUnder(unit: Unit, tile: Tile): boolean {
  const def = unitDef(unit.type);
  if (def.laysRoad === true) return layRoad(tile, unit.ownerId);
  if (!trades(def)) return false;
  if (unit.trade === undefined) return false;
  return layRoad(tile, unit.ownerId);
}

/** May the connection fill cross this hex? */
function fillAdmits(
  map: GameMap,
  owner: { at(index: number): number | null },
  cityCells: ReadonlySet<number>,
  playerId: number,
  tile: Tile,
): boolean {
  const index = tileIndex(map, tile.col, tile.row);
  // Never through another seat's ground. Your own, or nobody's.
  const holder = owner.at(index);
  if (holder !== null && holder !== playerId) return false;
  // A town is a junction: the fill crosses a city centre whether or not a
  // caravan has happened to wear a road across it. That is the honest reading of
  // "connected by road" — the road ends *at* the gates — and it is what stops a
  // route's own two endpoints reading as unconnected until a caravan comes home.
  if (cityCells.has(index)) return true;
  return tile.road !== undefined;
}

/** What one connected city pays its empire. See `connectedCities`. */
export interface ConnectedCity {
  city: City;
  /** `floor(pop / rules.trade.connectionPerPop)`. */
  gold: number;
}

/**
 * Every non-capital city of this empire joined to its capital by road, with what
 * each pays.
 *
 * A **flood fill**, hoisted for one sweep and never stored — `tileOwnerField`'s
 * bargain, and for its reason: a stored connection graph would be a second thing
 * to keep in step with every road laid, every city founded and every border that
 * moved. It is a pure function of the board, so it is asked when it is wanted.
 *
 * The rules, and each is a decision:
 *
 *   · the root is `capitalCityOf` — the oldest city the empire *founded* — so a
 *     captured capital moves the graph's root with no code at all, which is the
 *     Civ rule;
 *   · the fill crosses hexes that are **this empire's or nobody's**, never
 *     another seat's: a highway through a rival's territory is a road you do not
 *     control;
 *   · a **city centre is a junction** (see `fillAdmits`), so the road has only to
 *     reach the gates;
 *   · the capital itself pays nothing — it is what the others are connected *to*.
 *
 * Neighbours come from `mapNeighbors`, so a connection may cross the east–west
 * seam exactly as a march may. Cities come back in `state.cities` order, which
 * is founding order, so the list is a fact about the state.
 */
export function connectedCities(state: GameState, playerId: number): ConnectedCity[] {
  const capital = capitalCityOf(state, playerId);
  if (!capital) return [];
  const { map } = state;

  const cityCells = new Set<number>();
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    cityCells.add(tileIndex(map, city.col, city.row));
  }
  const owner = tileOwnerField(state);

  const start = getTileAt(map, capital.col, capital.row);
  if (!start) return [];
  const seen = new Uint8Array(map.tiles.length);
  const frontier: Tile[] = [start];
  seen[tileIndex(map, start.col, start.row)] = 1;
  while (frontier.length > 0) {
    const tile = frontier.pop()!;
    for (const hex of mapNeighbors(map, tileHex(tile))) {
      const next = getTile(map, hex);
      if (!next) continue;
      const index = tileIndex(map, next.col, next.row);
      if (seen[index] === 1) continue;
      if (!fillAdmits(map, owner, cityCells, playerId, next)) continue;
      seen[index] = 1;
      frontier.push(next);
    }
  }

  const per = Math.max(1, Math.floor(TRADE.connectionPerPop));
  const list: ConnectedCity[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    if (city.id === capital.id) continue;
    if (seen[tileIndex(map, city.col, city.row)] !== 1) continue;
    list.push({ city, gold: Math.floor(city.population / per) });
  }
  return list;
}
