/**
 * Maintenance: what an empire pays every turn simply for having what it has.
 *
 * The user's ruling of 2026-08-28, and the second half of the note `trade.ts`
 * left on `explainTradeGold` when roads became the first upkeep this game ever
 * charged: *"buildings and units are the obvious next two, and they join this
 * fold rather than opening a second one."* They do. This module answers the two
 * new questions and nothing else; `explainEmpireGold` (`empireGold.ts`, which
 * left `trade.ts` with the flood fill on 2026-08-28) is still the one list the
 * treasury's per-turn figure is the fold of, and it now has four lines instead
 * of two.
 *
 * The price is the age
 * --------------------
 * A warrior costs 1💰, a swordsman 2💰, a knight 3💰 — **the age of the
 * technology that unlocks it**, read off the tree through the same inverse
 * `techGifts` reads (`UNIT_UNLOCK_TECH`, `BUILDING_UNLOCK_TECH`). Nothing is
 * written on a unit row and nothing is written on a building row, which is the
 * whole point: `data/techs.json` already says when a thing belongs to history,
 * and a second `upkeep:` field beside every price would be a second answer that
 * drifts the first time a designer moves a unit to a different node. It is the
 * same argument `explainUnitCost`'s age band makes about the *price* one column
 * over — "`unlocks` already says when a unit belongs".
 *
 * Who is exempt, and why each
 * ---------------------------
 * Three exemptions on the *type*, and they are three different sentences:
 *
 *   · a **non-combatant** (`isCivilian`) — a settler, a worker, an augur, a
 *     prophet, a great person. An empire is not taxed for its people, only for
 *     its army;
 *   · an **explorer** (`isExplorer`) — the scout, which `isCombatant` calls a
 *     soldier because it carries five strength and which the ruling calls a
 *     civilian because nobody garrisons with one. The roster's own reading is
 *     the tiebreak: a piece that crosses a wooded hill for the price of open
 *     grass is a piece built to *look*, and the opening kit is a settler and a
 *     scout (`rules.startingUnits`), which must not open the game in debt;
 *   · a **trader** (`trades`) — a caravan is the thing that *pays*, and charging
 *     it maintenance would be charging a road twice.
 *
 * And one exemption on the *piece*: `Unit.freeUpkeep`, which says "this empire
 * never paid for this". See its docblock in `state.ts` for the register of the
 * seams that write it.
 *
 * A building pays iff it feeds the renown bucket
 * ----------------------------------------------
 * `BuildingDef.renown` is the marker (the ruling's own words), and it is a
 * happy one rather than an arbitrary one: the rows that pay renown are exactly
 * the rows that are *institutions* — a barracks, a library, a market, a
 * workshop, a watermill, an amphitheater, a university — while a granary, a
 * palisade or a monument is a thing you built once. **Wonders are exempt**, and
 * that is a design decision rather than a consequence: a wonder pays renown by
 * the same field, and the orchestrator's ruling is that a marvel is not a
 * payroll.
 *
 * A building with no unlock tech pays nothing, for the unit rule's reason
 * exactly: there is no age to charge. The Gilded Hall (a card's gift, on no
 * node) is the only such row today.
 *
 * Everything here is a **list**, folded by its caller (hard rule 5). Nothing in
 * this module knows what a treasury is; `collectYields` banks and `debtPercent`
 * is `cities.ts`' line in `cityYieldPercents`.
 */

import { BUILDING_UNLOCK_TECH, UNIT_UNLOCK_TECH, techDef } from './techData';
import { type BuildingId, buildingDef } from './buildingData';
import { type UnitTypeId, isCivilian, isExplorer, trades, unitDef } from './unitData';
import { RULES } from './rulesData';
// Salt's Æra III shilling a soldier, read through the one luxury evaluator. It
// takes `unitUpkeepOf` handed in for `cardUpkeepRebateLines`' reason exactly —
// so the arrow between the two modules stays one-way.
import { resourceUpkeepRebateLines } from './resourceEffects';
import { cardRulePercent, cardUpkeepRebateLines, foldCardRulePercent } from './statecraft';
import type { GameState, Unit } from './state';

/**
 * One thing an empire is paying maintenance on, as the hover prints it.
 *
 * `gold` is **positive** — what the line costs — because that is how a list of
 * charges reads to a player. The two folds below are what negate it into the
 * treasury's signed figure, in exactly one place each.
 */
export interface UpkeepLine {
  /** Display label: "Warrior", "Library · Aldermarch". */
  source: string;
  /** Gold per turn this line costs. Always ≥ 1 — a free line is never emitted. */
  gold: number;
}

/** `UpkeepLine` plus the piece it is about, for the disband sweep. */
export interface UnitUpkeepLine extends UpkeepLine {
  unitId: number;
  type: UnitTypeId;
}

/** `UpkeepLine` plus the row and the town, for a panel that wants to point. */
export interface BuildingUpkeepLine extends UpkeepLine {
  building: BuildingId;
  cityId: number;
}

/**
 * What one unit *type* costs its empire per turn, before any fact about a
 * particular piece. The pure reader — the Compendium's figure and the build
 * list's hover, neither of which has a `Unit` to ask about.
 *
 * Zero for every exemption in the docblock above, and zero for a type no
 * technology unlocks: there is no age to charge, which is why the great person
 * needs no clause of its own.
 */
export function unitUpkeep(type: UnitTypeId): number {
  const def = unitDef(type);
  if (isCivilian(def) || isExplorer(def) || trades(def)) return 0;
  const tech = UNIT_UNLOCK_TECH.get(type);
  if (tech === undefined) return 0;
  return techDef(tech).age * RULES.upkeep.goldPerUnitAge;
}

/**
 * What one *piece* costs its empire per turn: its type's figure, or nothing at
 * all when the empire never paid for it (`Unit.freeUpkeep`).
 *
 * The two readings are split because they answer different questions — "what
 * does a knight cost" is a fact about the roster and belongs on a sheet, "what
 * does *this* knight cost" is a fact about the board and belongs in the ledger
 * — and a caller that has a piece must ask this one or a captured warrior will
 * quietly start charging rent.
 */
export function unitUpkeepOf(unit: Unit): number {
  if (unit.freeUpkeep) return 0;
  return unitUpkeep(unit.type);
}

/**
 * What one building row costs the town holding it per turn. The pure reader,
 * `unitUpkeep`'s sibling, and the Compendium's other figure.
 *
 * A wonder pays nothing, a row with no `renown` pays nothing, and a row on no
 * technology pays nothing — three refusals in precedence, each one a different
 * sentence and none of them collapsible into the others.
 */
export function buildingUpkeep(id: BuildingId): number {
  const def = buildingDef(id);
  if (def.wonder === true) return 0;
  if (def.renown === undefined) return 0;
  const tech = BUILDING_UNLOCK_TECH.get(id);
  if (tech === undefined) return 0;
  return techDef(tech).age * RULES.upkeep.goldPerBuildingAge;
}

/**
 * True when this seat pays maintenance at all.
 *
 * **The wild pays nothing** (the ruling), and it is the same skip
 * `runStatecraft` and `advanceResearch` make for the same reason: the wild has
 * no treasury to keep, no screen to be told about it on, and an army it musters
 * out of the tier the real empires reached rather than out of coin. A
 * `realPlayers` filter would be the sweep-shaped way to say this, but every
 * caller here already holds one seat's id, so the question is asked of the seat.
 */
function seatPays(state: GameState, playerId: number): boolean {
  const player = state.players[playerId];
  return player !== undefined && !player.barbarian;
}

/**
 * Every piece this empire is paying for, in `state.units` order — which is the
 * order they were minted, so the list is stable and a replay reproduces it.
 *
 * Free pieces and exempt types are **omitted** rather than listed at zero: this
 * is the list a hover prints, and a page of "Settler · 0💰" is a page that
 * teaches the wrong rule.
 */
export function explainUnitUpkeep(state: GameState, playerId: number): UnitUpkeepLine[] {
  const lines: UnitUpkeepLine[] = [];
  if (!seatPays(state, playerId)) return lines;
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const gold = unitUpkeepOf(unit);
    if (gold <= 0) continue;
    lines.push({ source: unitDef(unit.type).name, gold, unitId: unit.id, type: unit.type });
  }
  return lines;
}

/**
 * Every building this empire is paying for, in `state.cities` order and then in
 * each town's own `buildings` order — founding order and completion order, both
 * of which a replay reproduces.
 *
 * A captured town's institutions are charged to whoever holds them, with no
 * bookkeeping anywhere: this reads the board, and the board says who owns the
 * city the library stands in. That is the same "what a wonder pays follows the
 * stones" reading Entry XXX makes one field over.
 */
export function explainBuildingUpkeep(state: GameState, playerId: number): BuildingUpkeepLine[] {
  const lines: BuildingUpkeepLine[] = [];
  if (!seatPays(state, playerId)) return lines;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    for (const id of city.buildings) {
      const gold = buildingUpkeep(id);
      if (gold <= 0) continue;
      lines.push({
        source: `${buildingDef(id).name} · ${city.name}`,
        gold,
        building: id,
        cityId: city.id,
      });
    }
  }
  return lines;
}

/** The fold of `explainUnitUpkeep`, positive. The only sum of one. */
export function unitUpkeepTotal(state: GameState, playerId: number): number {
  let total = 0;
  for (const line of explainUnitUpkeep(state, playerId)) total += line.gold;
  return total;
}

/**
 * What this empire's **law and its luxuries** take off its payroll, as the
 * labelled lines `explainEmpireGold` (`empireGold.ts`) folds beside the gross
 * figure — Tyranny's thirty percent, The Standing Army's whole hundred, and
 * salt's shilling a soldier.
 *
 * A **rebate line** rather than a discounted total, and both halves of that are
 * the design. Rule 5 says a figure is the fold of a list a player can read, so
 * the ledger shows what the army costs and then what the law gives back; and
 * `disbandCandidate` keeps picking off the *gross* figures, which is what makes
 * the creditors' choice — dearest first — the same choice under every
 * government.
 *
 * The percentages **sum before one multiplication** (`foldCardRulePercent`) and
 * the rebate is clamped to the payroll: a card that says −150% pays the army off
 * and stops, because a treasury that earned coin by keeping soldiers would be a
 * mint. One line per card, so two discounts read as two reasons.
 */
export function explainUnitUpkeepRebate(state: GameState, playerId: number): UpkeepLine[] {
  if (!seatPays(state, playerId)) return [];
  const gross = unitUpkeepTotal(state, playerId);
  if (gross <= 0) return [];
  const out: UpkeepLine[] = [];
  // **The flat half first** — a figure per soldier, counted off the pieces
  // themselves (`cardUpkeepRebateLines`, which owns the card reading and takes
  // the price from here so the arrow between the two modules stays one-way).
  // Before the percentage because that is the order a player reads them: the
  // quartermasters shave a shilling off each man, and *then* the law takes its
  // share of what is left. Both are clamped against the same gross below.
  let given = 0;
  for (const flat of cardUpkeepRebateLines(state, playerId, unitUpkeepOf)) {
    const share = Math.min(flat.gold, gross - given);
    if (share <= 0) break;
    given += share;
    out.push({ source: flat.source, gold: share });
  }
  // **And the salt**, in the same list and under the same clamp. A luxury's
  // rebate is the cards' rebate in every respect that matters here — a figure
  // per soldier, floored at what that soldier costs, labelled with where it came
  // from — so it is a second *source* feeding one give-back list, never a second
  // subtraction under the total. After the cards because the law is the older
  // reading and a player who has both should see the charter first.
  for (const flat of resourceUpkeepRebateLines(state, playerId, unitUpkeepOf)) {
    const share = Math.min(flat.gold, gross - given);
    if (share <= 0) break;
    given += share;
    out.push({ source: flat.source, gold: share });
  }
  const lines = cardRulePercent(state, playerId, 'unitUpkeep');
  const percent = foldCardRulePercent(lines);
  if (percent >= 0) return out;
  // The whole rebate first, then shared out in the lines' own order so the parts
  // sum to it exactly however the flooring falls — `explainUnitCost`'s
  // running-difference discipline, one ledger over.
  const rebate = Math.min(gross - given, Math.floor((gross * -percent) / 100));
  if (rebate <= 0) return out;
  let paid = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const share =
      i === lines.length - 1
        ? rebate - paid
        : Math.floor((rebate * line.percent) / percent);
    paid += share;
    if (share === 0) continue;
    out.push({ source: line.source, gold: share });
  }
  return out;
}

/** The fold of `explainBuildingUpkeep`, positive. The only sum of one. */
export function buildingUpkeepTotal(state: GameState, playerId: number): number {
  let total = 0;
  for (const line of explainBuildingUpkeep(state, playerId)) total += line.gold;
  return total;
}

// --- the debt spiral --------------------------------------------------------

/**
 * True while this empire's treasury is under water.
 *
 * **The treasury may go negative** (the ruling), which is the whole of why this
 * predicate exists rather than a clamp at zero: an empire that overbuilds its
 * army is *allowed* to, and what happens to it is a penalty it can read on its
 * own screen and dig out of. Two things read this — the −25% on science and
 * culture (`cityYieldPercents`, an empire-stage line so it stacks with the meter
 * tiers exactly as Entry XVII says) and the disband sweep below — and neither
 * has its own copy of the comparison.
 */
export function treasuryInDebt(player: { gold: number; barbarian?: boolean }): boolean {
  if (player.barbarian === true) return false;
  return player.gold < 0;
}

/** What disbanding one unit for arrears did, for the toast that has to say so. */
export interface DisbandReport {
  unitId: number;
  ownerId: number;
  type: UnitTypeId;
  /** What the piece had been costing, so the news can say what it bought back. */
  upkeep: number;
}

/**
 * The piece the creditors take, or `null` when this empire owes nothing it
 * cannot carry.
 *
 * **Dearest upkeep first, then the oldest** — lowest id, which is mint order and
 * therefore a fact a replay reproduces. Dearest first because it is the fastest
 * way out of the hole and because it is the reading a player can predict; oldest
 * as the tiebreak because a unit built this turn is the one the player is
 * thinking about.
 *
 * The pure half, so the sweep and any preview read one answer. It picks from
 * `explainUnitUpkeep`, which means an exempt or free piece can never be taken:
 * an empire in arrears does not lose its settlers.
 */
export function disbandCandidate(state: GameState, playerId: number): UnitUpkeepLine | null {
  const player = state.players[playerId];
  if (!player || player.barbarian) return null;
  if (player.gold >= RULES.upkeep.disbandBelow) return null;
  let best: UnitUpkeepLine | null = null;
  for (const line of explainUnitUpkeep(state, playerId)) {
    if (best === null) {
      best = line;
      continue;
    }
    if (line.gold > best.gold) best = line;
    else if (line.gold === best.gold && line.unitId < best.unitId) best = line;
  }
  return best;
}
