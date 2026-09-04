/**
 * What an empire's *buildings* are worth, for everything a building says that is
 * not a flat city yield: the happiness it supplies, the stat it adds to its own
 * town, the hit points it adds to that town's walls, (Entry XXVII) what it pays
 * on the **ground** that town works, and — since the charters, 2026-09-04 — the
 * crowding it forgives, the discount it puts on the town's purchases, what it
 * mends on friendly pieces beside it, and what it pays for a rite performed
 * here.
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

import { BUILDING_IDS, type BuildingId, buildingDef } from './buildingData';
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

/**
 * **Does a building standing in this town water it** — an aqueduct, or the
 * charters' Cistern?
 *
 * The one reading of `BuildingDef.waters`, so that nothing anywhere compares a
 * building id against `"aqueduct"`, exactly as `isWonder` is the one reading of
 * `wonder`. Asked by one rule: the dry-settle penalty a town off fresh water
 * pays on its growth surplus (`explainGrowthPercent`, `cities.ts`).
 *
 * A boolean rather than a list, and the one answer in this file that is: the
 * other three are numbers a breakdown has to print with their reasons beside
 * them, and this is a *gate* — the reason is printed by the line it removes,
 * which is the one the player is looking for ("No fresh water", gone the turn
 * the aqueduct is raised).
 *
 * It answers about the **town** and not the ground under it: `cityHasFreshwater`
 * (`statecraft.ts`) is the board's question and is untouched by anything built,
 * so an aqueduct feeds this city's people and still waters nobody's fields.
 */
export function cityIsWatered(city: City): boolean {
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id)) continue;
    if (buildingDef(id).waters === true) return true;
  }
  return false;
}

/**
 * What **this city's own** buildings mend on friendly pieces resting in or
 * beside it — the Keep's five (the charters, 2026-09-04).
 *
 * A list, like everything else here, because it lands in a sum a player is
 * entitled to read a reason for: a warrior that mended fifteen instead of ten
 * mended for a named thing standing in a named town.
 *
 * It answers about the **building** and says nothing about reach: how far
 * "beside" goes, and which pieces are resting, are the board's questions and
 * they belong to the one place a heal is decided (`healUnits`, `turn.ts`). This
 * module has no map and wants none — a ring walk in here would be a second
 * opinion about adjacency beside `isMountainAdjacent`'s.
 */
export function buildingAdjacentHeal(city: City): BuildingCityStatLine[] {
  const list: BuildingCityStatLine[] = [];
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id)) continue;
    const amount = buildingDef(id).healsAdjacent ?? 0;
    if (amount === 0) continue;
    list.push({ source: buildingDef(id).name, amount });
  }
  return list;
}

/**
 * What **this city's own** buildings take off the price of anything it buys, as
 * signed whole percents — the Assay House's five off.
 *
 * A list for `buildingCityStat`'s reason exactly: it is folded into
 * `explainPurchaseCost`'s ordered lines beside the cards' own riders, summed
 * with them and applied **once** (Entry XVII at the scale of a price tag), and
 * the label on that line names every source that made it. A number here would
 * have printed a cheaper settler with nothing to point at.
 */
export function buildingPurchaseDiscount(city: City): BuildingCityStatLine[] {
  const list: BuildingCityStatLine[] = [];
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id)) continue;
    const amount = buildingDef(id).purchaseDiscount ?? 0;
    if (amount === 0) continue;
    list.push({ source: buildingDef(id).name, amount });
  }
  return list;
}

/**
 * What share of **this city's** crowding its own buildings forgive, as one whole
 * percent — the Assize Court's fifteen.
 *
 * The one answer in this file that is summed here rather than by its consumer,
 * and the reason is the meter's own shape: `explainHappiness` prints crowding as
 * a single cost line per town, so the relief it prints is a single gain line per
 * town, and two courts in one city (which no rule allows) would still be one
 * discount rather than two multiplications. The percent is clamped to a share of
 * the cost — a relief may forgive crowding and may not pay a town for being
 * large.
 */
export function buildingCrowdingRelief(city: City): number {
  let percent = 0;
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id)) continue;
    percent += buildingDef(id).crowdingRelief ?? 0;
  }
  return Math.max(0, Math.min(100, percent));
}

/**
 * What **this city's own** buildings pay their empire for a rite performed here
 * — the Chapel's five culture.
 *
 * A number rather than a list, and it is `cityIsWatered`'s bargain rather than
 * `buildingHappiness`': the consumer is an occasion, not a meter. What a player
 * reads is the rite's own report, one line naming the town — so the reason is
 * printed by the thing being paid rather than by a breakdown beside it.
 */
export function buildingRitePay(city: City): number {
  let total = 0;
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id)) continue;
    total += buildingDef(id).ritePays ?? 0;
  }
  return total;
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
 *
 * `hypothetical` is `cityYields`' preview hook reaching the *ground* — buildings
 * the town does not have, counted as if it did. It exists because a lighthouse
 * says nothing at all in a building's own flat yields: its whole worth is a line
 * on every coastal hex the town works, and a what-if that could not see one
 * appraised the Lighthouse at zero (the 2026-09-04 blind spot). The list is
 * walked in `BUILDING_IDS` order like the built one, and a candidate the town
 * already holds is counted once rather than twice — the loop is over the table,
 * not over the two arrays.
 */
export function buildingTileLines(
  city: City,
  techs: readonly TechId[],
  hypothetical: readonly BuildingId[] = [],
): TileLine[] {
  const list: TileLine[] = [];
  for (const id of BUILDING_IDS) {
    if (!city.buildings.includes(id) && !hypothetical.includes(id)) continue;
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
