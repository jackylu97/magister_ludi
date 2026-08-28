/**
 * What an empire's *buildings* are worth, for the four things a building says
 * that are not a flat city yield: the happiness it supplies, the stat it adds to
 * its own town, the hit points it adds to that town's walls, and (Entry XXVII)
 * what it pays on the **ground** that town works.
 *
 * `resourceEffects.ts`'s bargain one scale down, and for the same reason. A
 * building's flat yields are folded where yields are folded (`cityYields`), and
 * that has never needed a module of its own — but the day a building started
 * paying happiness and raising a wall, the alternative to this file was a
 * `buildingDef(...).happiness` reach inside `meters.ts` and another inside
 * `combat.ts`, each with its own loop over the empire's towns. Two loops is how
 * a captured city ends up still paying contentment to the empire that lost it.
 *
 * So: the *table* (`buildingData.ts`) says what a building is, and this says
 * what an empire's buildings are worth. Nothing else in the game asks a
 * building for either fact.
 *
 * Both answers are **lists**, never numbers, which is hard rule 5 read at the
 * two places these land: a happiness meter that said "+3" with no reason, and a
 * combat forecast that said "+5" beside the walls with no reason, are exactly
 * what a breakdown exists to prevent. Every consumer *folds* one into a
 * breakdown it already had.
 *
 * Cities are walked in `state.cities` order — founding order, and the order
 * every other sweep in the game uses — so the list a player reads this turn is
 * the list they read last turn with one more line on it.
 */

import { BUILDING_IDS, buildingDef } from './buildingData';
import { CITY_YIELD_KEYS } from './resourceData';
import type { City, GameState } from './state';
import type { TileLine } from './statecraft';
import type { TechId } from './techData';

/** One line of what a building pays a meter. `cardHappiness`' shape. */
export interface BuildingMeterLine {
  /** "Uruk · Funeral Games" — the town and the thing, in that order. */
  source: string;
  amount: number;
}

/** One line of what a building adds to its own city's defence or sight. */
export interface BuildingCityStatLine {
  source: string;
  amount: number;
}

/**
 * The happiness this empire's buildings supply, one line per building per town.
 *
 * Per *town* rather than per type, unlike `explainAuthority`'s "Monuments ×3":
 * a monument's writ is an empire-wide capacity and reads honestly as a count,
 * while a happiness building is a thing standing in a named place a player may
 * be about to lose. "Uruk · Funeral Games +3" is the line that survives being
 * read after the city changes hands.
 */
export function buildingHappiness(state: GameState, playerId: number): BuildingMeterLine[] {
  const list: BuildingMeterLine[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    for (const id of BUILDING_IDS) {
      if (!city.buildings.includes(id)) continue;
      const amount = buildingDef(id).happiness ?? 0;
      if (amount === 0) continue;
      list.push({ source: `${city.name} · ${buildingDef(id).name}`, amount });
    }
  }
  return list;
}

/**
 * What **this city's own** buildings add to one of its stats.
 *
 * The city rather than the empire, because that is the scale the question is
 * asked at: a palisade in Uruk does nothing for Lagash, and both consumers
 * (`planCombat`, `sightSources`) already have one city in hand. Buildings are
 * walked in `BUILDING_IDS` order — table order, not `city.buildings` order —
 * so two cities holding the same walls itemise them identically however they
 * happened to build them.
 */
export function buildingCityStat(
  city: City,
  stat: 'defense' | 'sight',
): BuildingCityStatLine[] {
  const list: BuildingCityStatLine[] = [];
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id)) continue;
    const declared = buildingDef(id).cityStat;
    if (declared === undefined || declared.stat !== stat || declared.amount === 0) continue;
    list.push({ source: buildingDef(id).name, amount: declared.amount });
  }
  return list;
}

/**
 * What **this city's own** buildings add to its maximum hit points.
 *
 * `buildingCityStat`'s sibling and deliberately not a fourth `stat` on it, for
 * the reason the two consumers are different questions: `cityStat` is read into
 * *strength* breakdowns (`planCombat`, `sightSources`) which are lists of points
 * a defender fights with, and this is read into a **capacity** — how much
 * punishment the walls absorb before the gates open (`cityMaxHp`, `combat.ts`).
 * A wall raises both and says so in two fields, because a watchtower raises one
 * and a granary neither.
 *
 * A list rather than a number, like everything else in this file, so a city
 * sheet can print "200 base · Palisade +25" instead of a bare 225.
 */
export function buildingCityHp(city: City): BuildingCityStatLine[] {
  const list: BuildingCityStatLine[] = [];
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id)) continue;
    const amount = buildingDef(id).cityHp ?? 0;
    if (amount === 0) continue;
    list.push({ source: buildingDef(id).name, amount });
  }
  return list;
}

/** The fold of a building city-stat list. The only sum of one. */
export function foldBuildingCityStat(list: readonly BuildingCityStatLine[]): number {
  let total = 0;
  for (const line of list) total += line.amount;
  return total;
}

/**
 * What **this city's own** buildings pay on the ground it works, as lines the
 * tile chain folds (`TileLine`, `statecraft.ts`).
 *
 * The third thing a building says that is not a flat yield, and the first that
 * lands on a *hex*. It is asked of one city for `buildingCityStat`'s reason —
 * a granary in Uruk pays Uruk's coastline and nobody else's — and it is resolved
 * *once per context* rather than once per tile, so a city sweeping twenty hexes
 * asks the building table once (see `cityContext` in `cities.ts`).
 *
 * `techs` rather than a `GameState`, because the only player-dependent term is
 * the line's own `requiresTech` and this module has no other reason to know what
 * research is. Buildings are walked in `BUILDING_IDS` order so two cities
 * holding the same granary itemise it identically.
 */
export function buildingTileLines(city: City, techs: readonly TechId[]): TileLine[] {
  const list: TileLine[] = [];
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id)) continue;
    for (const line of buildingDef(id).tileYields ?? []) {
      if (line.requiresTech !== undefined && !techs.includes(line.requiresTech)) continue;
      const add = line.add;
      const resolved: TileLine = {
        source: buildingDef(id).name,
        on: line.on,
        food: add.food ?? 0,
        production: add.production ?? 0,
        gold: add.gold ?? 0,
        science: add.science ?? 0,
        culture: add.culture ?? 0,
        faith: add.faith ?? 0,
      };
      // A line that pays nothing is a line in a breakdown that explains nothing,
      // which is the same bargain `cardTileLines` keeps.
      if (CITY_YIELD_KEYS.some((key) => resolved[key] !== 0)) list.push(resolved);
    }
  }
  return list;
}
