/**
 * **How many soldiers this seat's gold can pay for** (batch BP1 of bot pass 3,
 * `docs/flags.md` (ooooooo) P2).
 *
 * The audit (`docs/audit/bot-pass-3-competitiveness.md` §3.2) found seats in
 * deficit that trained a soldier every turn while the disband arm let one go
 * every turn. The two arms disagreed: the disband arm reads the net and the
 * treasury, and the build arm only charged the wage at gold's price, which the
 * threat line outweighed. This file is the reading both arms share now:
 *
 *   - the disband arm's own test (`wouldDisband`): the net is under
 *     `solvency.disbandBelowIncome` and the treasury will fall under
 *     `solvency.arrearsTreasury` within `solvency.runwayTurns` turns;
 *   - the forecast (`soldiersCarried`): how many more soldiers at a given wage
 *     the seat can pay for before that test would hold. The build arm does not
 *     train past it unless the seat faces a real threat (`realThreat`), and the
 *     want book reads it to make gold dearer when the levy wants soldiers the
 *     income cannot pay for (`armyWageRow`, `wants.ts`).
 *
 * **The books are read once a sitting.** `netGoldPerTurn` prices every town in
 * the empire, and the disband arm asked it before every decision of every seat
 * (13.4% of a late turn in the audit's profile). Now a seat reads its books once
 * when its sitting opens (`seatBooks`, `bot.ts`), and every later reading in the
 * turn moves that net by what the army's wages have done since (`netNow`). A
 * unit bought, disbanded or killed changes the wages, and the net follows it. A
 * building bought in the turn does not, and that is accepted: it is one turn.
 *
 * A leaf: it imports the rules and `campaign.ts`, and nothing in `src/ai/`
 * imports it back except the arms that read it.
 */

import { type AiConfig } from './aiConfig';
import { isFieldSoldier } from './campaign';

import { seatPeople } from '../sim/leaderData';
import { getTileAt, tileHex, wrappedDistance } from '../sim/map';
import { type City, type GameState, type Player, realPlayers } from '../sim/state';
import { upkeepWaived } from '../sim/statecraft';
import { isCombatant, unitDef } from '../sim/unitData';
import { unitUpkeep, unitUpkeepOf } from '../sim/upkeep';
import { atWar } from '../sim/wars';

/** A seat's books as it read them when its sitting opened. */
export interface SeatBooks {
  /** Net gold a turn, as the simulation's own books read it (`foldEmpireRates`). */
  net: number;
  /** The army's wages a turn at the same moment (`payrollOf`). */
  payroll: number;
}

/**
 * The wages this seat's units draw a turn: `unitUpkeepOf` for every piece,
 * less a piece whose wage a card has waived (`upkeepWaived`). The disband arm's
 * own reading of what letting a piece go saves, summed.
 *
 * It leaves out the law's surcharge and rebate lines (`explainEmpireGold`), so it
 * is the payroll before them. It is used only for how the payroll has moved
 * since the books were read, and a unit added or taken moves it by its own wage.
 */
export function payrollOf(state: GameState, playerId: number): number {
  let wages = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (upkeepWaived(state, unit)) continue;
    wages += unitUpkeepOf(unit);
  }
  return wages;
}

/** The net a turn now: the books' net, moved by what the payroll has done since they were read. */
export function netNow(state: GameState, playerId: number, books: SeatBooks): number {
  return books.net + books.payroll - payrollOf(state, playerId);
}

/**
 * Will this treasury fall under the arrears bar within `solvency.runwayTurns`
 * turns at the present net rate? A treasury already under the bar answers yes.
 *
 * The rate is read as it stands, with no guess about income to come. That is
 * the reading `goldPressure` uses, and the bot has no memory between turns to
 * read a trend from. A positive rate counts as nothing, so with a zero runway
 * this is exactly the old arrears test.
 *
 * Why the disband arm needs it (2026-10-26). The price of gold changes what the
 * bot builds next, but it cannot cut a bill the empire already pays. In the
 * long bot game a Dominion seat lost three things in four turns: a luxury deal
 * ran out (salt, which took a coin off each soldier's wage), it was dealt The
 * Debased Coin for a missed wager, and its archers upgraded to a dearer piece.
 * It then ran at −26 to −40 gold a turn for nine turns on a treasury of 85 to
 * 344 coins, and nothing acted until the treasury was under 40.
 */
export function headedIntoArrears(gold: number, net: number, ai: AiConfig): boolean {
  const turns = Math.max(0, ai.solvency.runwayTurns);
  return gold + Math.min(0, net) * turns < ai.solvency.arrearsTreasury;
}

/**
 * **Would the disband arm let a piece go** at this treasury and this net? Both
 * of its tests: the income is under `solvency.disbandBelowIncome`, and the
 * treasury is headed into arrears. The forecast below is this test solved for
 * the number of soldiers, so the build arm and the disband arm cannot disagree.
 */
export function wouldDisband(gold: number, net: number, ai: AiConfig): boolean {
  return net < ai.solvency.disbandBelowIncome && headedIntoArrears(gold, net, ai);
}

/** What the forecast reads. See `armySupport`. */
export interface ArmySupport {
  /** Net gold a turn now (`netNow`). */
  net: number;
  /** The treasury now. */
  treasury: number;
  /** The wages a turn of the soldiers already queued in this seat's towns. */
  queued: number;
  /** `solvency.supportMargin`: gold a turn the forecast keeps spare. */
  margin: number;
  /**
   * The real threat that lifts the limit, in words: a war with another empire,
   * or a town under attack (`realThreat`). `null` in a quiet world.
   */
  threat: string | null;
}

/**
 * The forecast's inputs for this seat now.
 *
 * `deciding` is the town whose production is being chosen. Its front row is
 * what the choice may replace, so its wage is not counted as queued: a town
 * asking whether to keep training the spearman at its front would otherwise
 * charge that spearman twice.
 */
export function armySupport(
  state: GameState,
  player: Player,
  ai: AiConfig,
  books: SeatBooks,
  deciding: City | null = null,
): ArmySupport {
  let queued = 0;
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    city.queue.forEach((row, index) => {
      if (row.kind !== 'unit') return;
      if (city === deciding && index === 0) return;
      queued += unitUpkeep(row.id);
    });
  }
  return {
    net: netNow(state, player.id, books),
    treasury: player.gold,
    queued,
    margin: Math.max(0, ai.solvency.supportMargin),
    threat: realThreat(state, player, ai),
  };
}

/**
 * **How many more soldiers at `wage` gold a turn this seat can pay for** before
 * the disband arm would let a piece go. Whole soldiers, rounded down. It is
 * negative when the seat already holds more than it can pay for. A piece with
 * no wage is never limited.
 *
 * The disband arm acts only when both of its tests hold (`wouldDisband`), so the
 * seat can carry `k` more soldiers while either test fails at the net they
 * would leave, `net − queued − margin − k × wage`:
 *
 *   - **the income** stays at or above `solvency.disbandBelowIncome`; or
 *   - **the treasury** lasts the runway at that net: the treasury less
 *     `runwayTurns` turns of the deficit stays at or above the arrears bar.
 *
 * Both are solved for `k`, and the larger answer is the forecast.
 *
 * **Under a real threat the line moves, but it does not go** (`support.threat`).
 * The seat may then train past the disband line, which is the ruling's
 * exception. It may not train past the point where the treasury would reach
 * nought within `solvency.recruitRunwayTurns` turns, because there the disband
 * arm lets even a new unit go (`raisedWithin`'s exception), and a soldier
 * trained to be disbanded is the loop this file exists to stop. The first after
 * set measured it: broke seats with a raider beside a town trained a warrior a
 * turn and lost one a turn. So under a threat `k` is solved for that test
 * instead: the net stays at or above nought, or the treasury lasts those turns.
 */
export function soldiersCarried(support: ArmySupport, wage: number, ai: AiConfig): number {
  if (wage <= 0) return Infinity;
  const spare = support.net - support.queued - support.margin;
  if (support.threat !== null) {
    const turns = Math.max(0, ai.solvency.recruitRunwayTurns);
    const byIncome = spare / wage;
    let byTreasury: number;
    if (support.treasury < 0) byTreasury = -Infinity;
    else if (turns === 0) byTreasury = Infinity;
    else byTreasury = (spare + support.treasury / turns) / wage;
    return Math.floor(Math.max(byIncome, byTreasury));
  }
  const { disbandBelowIncome, arrearsTreasury } = ai.solvency;
  const runway = Math.max(0, ai.solvency.runwayTurns);
  const byIncome = (spare - disbandBelowIncome) / wage;
  let byTreasury: number;
  if (support.treasury < arrearsTreasury) byTreasury = -Infinity;
  else if (runway === 0) byTreasury = Infinity;
  else byTreasury = (spare + (support.treasury - arrearsTreasury) / runway) / wage;
  return Math.floor(Math.max(byIncome, byTreasury));
}

/**
 * **A real threat**, in words, or `null`: the two cases in which the seat trains
 * soldiers past the disband line (the ruling's own words: *"at war, or a town
 * under attack"*), though never past the point where its treasury runs out
 * (`soldiersCarried`).
 *
 *   - **a war with another empire.** The wild is always at war and does not
 *     count here, or the limit would never hold.
 *   - **a town under attack**: a piece of the wild, or of an empire at war with
 *     this seat, within `threat.underAttackRadius` hexes of one of its towns.
 */
export function realThreat(state: GameState, player: Player, ai: AiConfig): string | null {
  for (const other of realPlayers(state)) {
    if (other.id === player.id || other.eliminated) continue;
    if (atWar(state, player.id, other.id)) return `at war with the ${seatPeople(state, other.id)}`;
  }
  const reach = Math.max(0, ai.threat.underAttackRadius);
  const towns: { city: City; at: ReturnType<typeof tileHex> }[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    const tile = getTileAt(state.map, city.col, city.row);
    if (tile) towns.push({ city, at: tileHex(tile) });
  }
  if (towns.length === 0) return null;
  for (const unit of state.units) {
    if (unit.ownerId === player.id) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    if (!atWar(state, player.id, unit.ownerId)) continue;
    const tile = getTileAt(state.map, unit.col, unit.row);
    if (!tile) continue;
    const here = tileHex(tile);
    for (const town of towns) {
      const distance = wrappedDistance(state.map, here, town.at);
      if (distance > reach) continue;
      return `${unitDef(unit.type).name} stands ${distance} hex${distance === 1 ? '' : 'es'} from ${town.city.name}`;
    }
  }
  return null;
}

/**
 * Is this roster row a soldier the forecast limits? A field soldier, which is
 * the levy's own count (`isFieldSoldier`), and not a hull, which this bot never
 * builds.
 */
export function limitedSoldier(id: Parameters<typeof unitDef>[0]): boolean {
  const def = unitDef(id);
  return isFieldSoldier(def) && def.category !== 'naval';
}
