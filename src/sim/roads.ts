/**
 * The road, and the two occasions that write one.
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
 */

import type { Tile } from './map';
import type { Unit } from './state';
import { trades, unitDef } from './unitData';

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
