/**
 * What a luxury does beyond its happiness: the **one** evaluator for the
 * signature-effect vocabulary.
 *
 * Every luxury pays the same two things — the gold on its tile, and a flat
 * `meters.happiness.perUniqueLuxury` to whoever has improved one. On top of
 * that each row may declare an `effect` (`resourceData.ts`), and this module is
 * the only place in the game that reads one. Four shapes go in; four labelled
 * lists come out; nothing anywhere else switches on `effect.kind`.
 *
 * That is the whole design, and it is deliberately narrower than "luxuries can
 * do things". A table where a row could name an arbitrary behaviour is a table
 * where every row is a special case somewhere in the simulation, and the thing
 * this milestone actually buys is that **a new luxury is a JSON row**: pick a
 * shape, pick numbers, and the scatter places it, the city panel explains it and
 * the turn pipeline banks it with no TypeScript written for it at all
 * (`test/resources.test.ts` proves that with a row invented at runtime).
 *
 * Two scales, one uniqueness rule
 * -------------------------------
 * A luxury's effect counts **once per unique kind**, never once per tile — the
 * same reading `controlledResources` gives the happiness meter, and for the same
 * reason: two improved jade seams are one jade in the player's hands. Where the
 * scales differ is *whose* hands:
 *
 *   · **empire** shapes (`empireYields`, `extraHappiness`) count once per kind
 *     for the whole empire. A second jade anywhere is worth nothing.
 *   · **local** shapes (`cityYields`, `productionBonus`) count once per kind
 *     *per city*, because the effect is the city's. Two jades in one city are
 *     one jade's signature; jade in two cities pays twice — which is the point
 *     of a "powerfully local" shape and the reason to go and settle the second
 *     seam rather than shrug at it.
 *
 * Each of the four functions below returns the *list*, and every consumer folds
 * it into a breakdown it already had: `cityYields` and the city panel for the
 * two yield shapes, `productionModifiers` for the hammers, `explainHappiness`
 * for the happiness. Totals are folds of lists, which is CLAUDE.md's rule 5 read
 * one scale out from a tile.
 *
 * The import cycle with `cities.ts`, and why it is safe
 * ----------------------------------------------------
 * The same cycle `meters.ts` documents, for the same reason and with the same
 * guarantee. This module asks `cities.ts` which resources a city and an empire
 * actually control — one rule, `openedResource`, and duplicating it here is
 * exactly what rule 5 forbids — and `cities.ts` asks this module for the lines
 * to fold into `cityYields`. It is a *function-level* cycle only: everything at
 * the top level here is a type or a constant from the data tables, and nothing
 * in this file may grow a top-level call into `cities.ts`.
 */

import type { ProductionCategory } from './buildingData';
import { cityResources, controlledResources } from './cities';
import {
  type ResourceEffect,
  type ResourceId,
  type ResourceYieldBag,
  resourceDef,
} from './resourceData';
import type { City, GameState } from './state';

/**
 * One line of what a resource's signature pays, in all five voices.
 *
 * Five rather than the tile chain's three because these land in a *city's*
 * ledger, where science and culture exist. Zeroes are carried rather than
 * omitted so a consumer folds one shape instead of five optional ones.
 */
export interface ResourceYieldLine {
  /** The resource whose signature this is. */
  resource: ResourceId;
  /** Display label — the resource's name, as every breakdown prints it. */
  source: string;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
}

/** One line of extra happiness, on top of the flat per-unique figure. */
export interface ResourceHappinessLine {
  resource: ResourceId;
  source: string;
  amount: number;
}

/** One line of hammers behind a category, as a signed whole percent. */
export interface ResourceProductionLine {
  resource: ResourceId;
  source: string;
  percent: number;
}

/** A yield bag read into a full line. Absent fields are zero, by definition. */
function lineOf(id: ResourceId, bag: ResourceYieldBag): ResourceYieldLine {
  return {
    resource: id,
    source: resourceDef(id).name,
    food: bag.food ?? 0,
    production: bag.production ?? 0,
    gold: bag.gold ?? 0,
    science: bag.science ?? 0,
    culture: bag.culture ?? 0,
  };
}

/** The declared effect of a resource, or `null`. The one place `effect` is read. */
function effectOf(id: ResourceId): ResourceEffect | null {
  return resourceDef(id).effect ?? null;
}

/**
 * The flat yields this city's own improved luxuries pay it, in table order.
 *
 * "Its own" is `cityResources`, which asks the same `openedResource` rule
 * `controlledResources` asks one scale up — so a plantation that has been
 * pillaged stops paying here for the same reason it stops paying the empire,
 * with no bookkeeping of its own.
 */
export function cityResourceYields(state: GameState, city: City): ResourceYieldLine[] {
  const list: ResourceYieldLine[] = [];
  for (const id of cityResources(state, city, 'luxury')) {
    const effect = effectOf(id);
    if (effect?.kind === 'cityYields') list.push(lineOf(id, effect));
  }
  return list;
}

/**
 * The flat yields the empire's unique improved luxuries pay it, in table order.
 *
 * Banked once per turn per player by `collectYields` and quoted by the top
 * bar's totals — never per city, which is what "per unique kind, not per copy"
 * means when the yield has no city to belong to.
 */
export function empireResourceYields(state: GameState, playerId: number): ResourceYieldLine[] {
  const list: ResourceYieldLine[] = [];
  for (const id of controlledResources(state, playerId, 'luxury')) {
    const effect = effectOf(id);
    if (effect?.kind === 'empireYields') list.push(lineOf(id, effect));
  }
  return list;
}

/** The fold of any list of resource-yield lines. The only sum of them. */
export function foldResourceYields(list: readonly ResourceYieldLine[]): {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
} {
  const total = { food: 0, production: 0, gold: 0, science: 0, culture: 0 };
  for (const line of list) {
    total.food += line.food;
    total.production += line.production;
    total.gold += line.gold;
    total.science += line.science;
    total.culture += line.culture;
  }
  return total;
}

/**
 * The extra happiness the empire's unique improved luxuries supply, in table
 * order — on *top* of the flat figure every one of them already pays.
 *
 * `explainHappiness` prints these as their own lines rather than folding them
 * into the luxury's flat line, because "Wine +4" and "Wine · vintage +2" are two
 * different facts: one is what a luxury is worth, the other is what *this*
 * luxury is worth, and a player comparing two seams needs to see them apart.
 */
export function resourceHappiness(state: GameState, playerId: number): ResourceHappinessLine[] {
  const list: ResourceHappinessLine[] = [];
  for (const id of controlledResources(state, playerId, 'luxury')) {
    const effect = effectOf(id);
    if (effect?.kind === 'extraHappiness') {
      list.push({ resource: id, source: resourceDef(id).name, amount: effect.amount });
    }
  }
  return list;
}

/**
 * The hammers this city's own improved luxuries put behind `category`, in table
 * order.
 *
 * The resource half of `productionModifiers` (`cities.ts`), which folds these
 * together with the buildings' — one shape, `{ category, percent }`, read from
 * two tables. That generalisation is what stopped the marble being a second
 * barracks special case, and it means the panel prints "Barracks +10%" and
 * "Marble +15%" as two lines of one list.
 */
export function resourceProduction(
  state: GameState,
  city: City,
  category: ProductionCategory,
): ResourceProductionLine[] {
  const list: ResourceProductionLine[] = [];
  for (const id of cityResources(state, city, 'luxury')) {
    const effect = effectOf(id);
    if (effect?.kind === 'productionBonus' && effect.category === category) {
      list.push({ resource: id, source: resourceDef(id).name, percent: effect.percent });
    }
  }
  return list;
}

/**
 * A resource's signature in words — "+3 gold in this city", "+2 culture to the
 * empire" — or `null` for a row with no signature.
 *
 * Here rather than in the interface because it is a reading of the vocabulary,
 * and the vocabulary is read in one file. Every text surface that names a
 * resource (the hover readout, the lens roundel's tooltip, the city panel) calls
 * this, so they cannot describe the same luxury two ways.
 */
export function describeResourceEffect(id: ResourceId): string | null {
  const effect = effectOf(id);
  if (!effect) return null;
  if (effect.kind === 'extraHappiness') {
    return `${signed(effect.amount)} happiness`;
  }
  if (effect.kind === 'productionBonus') {
    const category = effect.category === 'unit' ? 'units' : 'buildings';
    return `${signed(effect.percent)}% production toward ${category} in this city`;
  }
  const where = effect.kind === 'cityYields' ? 'in this city' : 'to the empire';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(lineOf(id, effect))) {
    if (key === 'resource' || key === 'source') continue;
    if (typeof value !== 'number' || value === 0) continue;
    parts.push(`${signed(value)} ${key}`);
  }
  return parts.length > 0 ? `${parts.join(', ')} ${where}` : null;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
