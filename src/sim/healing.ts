/**
 * How much a unit heals at the end of this turn, as a labelled list.
 *
 * The one place a unit's heal is decided. The `healUnits` phase (`turn.ts`)
 * adds the fold of this list to the unit's health, and the unit sheet prints
 * the same fold as "+X HP" on the Fortify button (`src/ui/unitPanel.ts`). So the
 * figure a player reads and the health the turn gives cannot disagree (hard
 * rule 5: the total is the fold of the list).
 *
 * The rule, in order:
 *
 *   1. A unit heals only if it rested: it spent no movement and did not attack
 *      this turn (`isRested`, `units.ts`).
 *   2. A unit at full health heals nothing.
 *   3. Under the `noHealAbroad` law, a unit outside its owner's borders heals
 *      nothing. A hex nobody owns is outside the borders.
 *   4. Otherwise it heals `rules.healing.perTurnIfRested`, plus what its
 *      empire's cards add (`explainCardUnitStat`, one line per card), plus what
 *      the friendly buildings in or beside it mend (the Keep's line, one line a
 *      town).
 *   5. The sum is capped at the unit's maximum health (`unitMaxHp`), as a
 *      labelled line of its own, so the fold is the health the unit gains.
 *
 * `unitHealRefusal` says which of clauses 1 to 3 stops a heal, in a player's
 * words. `explainUnitHeal` returns an empty list exactly when it does.
 *
 * A leaf: it imports the rules it reads and nothing imports it but the turn
 * phase and the interface, so it adds no import cycle.
 */

import { buildingAdjacentHeal } from './buildingEffects';
import { tileOwnerPlayerId } from './cities';
import { getTileAt, tileHex, wrappedDistance } from './map';
import { unitHealthBonus } from './resourceEffects';
import { RULES } from './rulesData';
import type { GameState, Unit } from './state';
import { cardBehaviorRule, explainCardUnitStat } from './statecraft';
// What a town holds, a card's grants included (Expansionist batch E12).
import { townShelf } from './statecraft/evaluator';
import { unitMaxHp } from './unitData';
import { fullMovement } from './units';

/** One labelled share of a unit's heal this turn. */
export interface UnitHealLine {
  label: string;
  amount: number;
}

/**
 * Why this unit heals nothing at the end of this turn, in a player's words, or
 * `null` when it heals.
 *
 * Clauses 1 to 3 of the module's rule. The sentences name no number (hard rule
 * 7), so they read the same whatever the data says.
 */
export function unitHealRefusal(state: GameState, unit: Unit): string | null {
  if (unit.hasAttacked) return 'It attacked this turn.';
  if (unit.movesLeft !== fullMovement(unit, state)) return 'It moved or acted this turn.';
  const maxHp = unitMaxHp(unit, unitHealthBonus(state, unit.ownerId));
  if (unit.hp >= maxHp) return 'It is at full health.';
  if (
    cardBehaviorRule(state, unit.ownerId, 'noHealAbroad') &&
    tileOwnerPlayerId(state, unit.col, unit.row) !== unit.ownerId
  ) {
    return 'Under your laws, units do not heal outside your borders.';
  }
  return null;
}

/**
 * What this unit heals at the end of this turn, line by line, or an empty list
 * when `unitHealRefusal` gives a reason. See the module docblock for the rule.
 */
export function explainUnitHeal(state: GameState, unit: Unit): UnitHealLine[] {
  if (unitHealRefusal(state, unit) !== null) return [];
  const lines: UnitHealLine[] = [{ label: 'Resting', amount: RULES.healing.perTurnIfRested }];
  // The cards that add to the heal, each under its own name. The one reader of
  // a card's `heal` stat is `cardUnitStat`; this is its list.
  for (const line of explainCardUnitStat(state, unit, 'heal')) lines.push(line);
  for (const line of keepHealLines(state, unit)) lines.push(line);
  // The cap, as a line, so the fold is the health the unit actually gains. The
  // piece's own maximum, with its empire's share (`unitMaxHp`), which is the
  // bar every heal in the game fills.
  const room = unitMaxHp(unit, unitHealthBonus(state, unit.ownerId)) - unit.hp;
  const sum = foldUnitHeal(lines);
  if (sum > room) lines.push({ label: 'Capped at full health', amount: room - sum });
  return lines;
}

/** The one sum of `explainUnitHeal`'s lines: the health the unit gains. */
export function foldUnitHeal(lines: readonly UnitHealLine[]): number {
  let total = 0;
  for (const line of lines) total += line.amount;
  return total;
}

/**
 * What friendly walls on this unit's hex or on one of the six touching it mend
 * for it this turn: the Keep's line (the charters, 2026-09-04), one line a town.
 *
 * The **town's** reach rather than the unit's: the ring of six plus the centre,
 * which is the reach every other "beside this town" clause takes. Friendly
 * means the same seat; a Keep mends its own realm's soldiers only. Two Keeps in
 * reach both pay, and the cap in `explainUnitHeal` still applies to the sum.
 *
 * It reads `buildingAdjacentHeal` (`buildingEffects.ts`), so nothing here names
 * a keep, and it walks `state.cities` in founding order, like every other sweep.
 * It was `keepHeal` in `turn.ts` until the heal moved here.
 */
function keepHealLines(state: GameState, unit: Unit): UnitHealLine[] {
  const lines: UnitHealLine[] = [];
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return lines;
  const eye = tileHex(from);
  for (const city of state.cities) {
    if (city.ownerId !== unit.ownerId) continue;
    const seat = getTileAt(state.map, city.col, city.row);
    if (!seat || wrappedDistance(state.map, eye, tileHex(seat)) > 1) continue;
    for (const line of buildingAdjacentHeal(townShelf(state, city))) {
      lines.push({ label: `${line.source} · ${city.name}`, amount: line.amount });
    }
  }
  return lines;
}
