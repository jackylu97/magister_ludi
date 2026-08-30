/**
 * The blockade: a heavy hull parked off a port, and the two things that follow
 * from it.
 *
 * **A leaf**, and that is the whole reason the file exists (the naval line,
 * 2026-08-29). One idea has two readers on opposite sides of the module graph —
 * `siegeField` (`combat.ts`, which imports `cities.ts`) and `explainRouteYield`
 * (`routeYields.ts`, which is a leaf *on the city side* precisely so that it
 * imports neither) — and a rule written in either of them would have to be
 * copied into the other or would close a runtime cycle. So it lives here,
 * importing nothing but the four tables every module may: the map, the state,
 * the terrain rows and the unit rows.
 *
 * `roads.ts` and `empireGold.ts` made the same move for the same reason, and
 * `test/mapgen/moduleCycles.test.ts` is what keeps it honest.
 *
 * What a blockade *is*
 * --------------------
 * A hull whose row carries `UnitDef.blockades` — the heavy line — standing on
 * **water** beside a town it does not own. Two consequences, and they are two
 * readings of one fact rather than two rules:
 *
 *   · **The sea lane is denied.** `siegeField` marks the water around such a
 *     hull, which is what lets one ship cut a small port: `underSiege` denies a
 *     water hex only when somebody is *standing* on it (an open sea lane is a
 *     supply line, and nothing blockades the sea by standing beside it), so
 *     without this clause a three-hex harbour would need three warships.
 *   · **The town's routes pay nothing.** One labelled line in the route fold,
 *     which is rule 5: a caravan that stops paying says why on the sheet it
 *     stopped paying on, rather than a number quietly going to zero.
 *
 * Asked of the roster's own marker throughout. Nothing here compares a unit type
 * against a name and nothing switches on a naval `ModelClass`, which is art —
 * `blockades` is the row that says what this hull is for.
 */

import { type GameMap, type Tile, getTile, getTileAt, mapNeighbors, tileHex } from './map';
import type { City, GameState } from './state';
import { isWaterTerrain } from './terrainData';
import { type UnitDef, unitDef } from './unitData';

/**
 * Does this row blockade? THE reading of `UnitDef.blockades`, so that nothing
 * anywhere compares a type against `"warGalley"` — `trades`' and `isNaval`'s
 * discipline, one field over.
 */
export function blockades(def: UnitDef): boolean {
  return def.blockades === true;
}

/**
 * The **water** hexes one hull denies by sitting where it sits, in
 * `HEX_DIRECTIONS` order.
 *
 * Its own hex is deliberately not in the list: `siegeField` has already marked
 * that as held, for every combat unit, before it ever asks this. What this adds
 * is the *lane* — the sea around the ship, which nothing else in the game denies
 * by proximity.
 *
 * Water only, and that is the rule rather than an optimisation: a hull cannot
 * deny dry ground it could never stand on, and a blockade that reached inland
 * would be a warship holding a field.
 */
export function blockadedWaterAround(map: GameMap, from: Tile): Tile[] {
  const lane: Tile[] = [];
  for (const hex of mapNeighbors(map, tileHex(from))) {
    const tile = getTile(map, hex);
    if (!tile || !isWaterTerrain(tile.terrain)) continue;
    lane.push(tile);
  }
  return lane;
}

/**
 * Is a foreign hull sitting off this town's harbour right now?
 *
 * Derived every time it is asked and **never stored**, which is `underSiege`'s
 * rule and the barbarian role's: a blockade is a fact about where a ship is
 * standing this instant, and a flag on `City` would be a second answer a save
 * could disagree with.
 *
 * Three clauses and each is a sentence. **Somebody else's** — there is no
 * diplomacy, so foreign is hostile, the same reading `zocField` and `siegeField`
 * give the word, and it is what lets the wild blockade a port with no barbarian
 * special case. **On water** — a hull in the town's own gate is a garrison, not
 * a blockade, and a hull on any dry hex is impossible anyway. **Adjacent to the
 * centre** — a blockade is the mouth of the harbour, not the coastline.
 *
 * `state.units` in array order, though the answer is a boolean and no outcome
 * can depend on the order: the discipline, not the requirement.
 */
export function cityBlockaded(state: GameState, city: City): boolean {
  const centre = getTileAt(state.map, city.col, city.row);
  if (!centre) return false;
  const ring = new Set<string>();
  for (const hex of mapNeighbors(state.map, tileHex(centre))) {
    const tile = getTile(state.map, hex);
    if (!tile || !isWaterTerrain(tile.terrain)) continue;
    ring.add(`${tile.col},${tile.row}`);
  }
  if (ring.size === 0) return false;
  for (const unit of state.units) {
    if (unit.ownerId === city.ownerId) continue;
    if (!blockades(unitDef(unit.type))) continue;
    if (ring.has(`${unit.col},${unit.row}`)) return true;
  }
  return false;
}
