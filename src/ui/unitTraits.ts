/**
 * A piece's line traits, as the unit card, the hover row and the turn
 * hand-over print them (Scientific batch S10).
 *
 * A line trait is a bonus and an ability that a charter technology gives a
 * whole line of units (`TechDef.traits`, batch S1). The piece carries no field
 * for it: its traits are read off its owner's technologies and its type each
 * time (`traitsReaching`), so a captured piece takes its captor's traits and
 * the piece fingerprint does not change. The rulings are
 * `docs/plans/scientific-themes.md` sections 3, 13 and 14: the unit keeps its
 * type name with the trait after it ("Catapult · Onager"), and the bonus and
 * the ability print as labelled lines.
 *
 * Every figure here is the simulation's own. A strength line is
 * `combatLineAmount`, the function the combat forecast folds with, asked about
 * the piece defending where it stands. The range is the row's range plus
 * `cardUnitStat`, which is exactly how a ranged attack measures its reach
 * (`combat.ts`). This module only labels and lists them.
 *
 * Pure, apart from reading the state, so the suite can test it without a DOM.
 */

import {
  type CardClause,
  type CombatSituation,
  cardUnitStat,
  combatLineAmount,
} from '../sim/statecraft';
import { describeTrait } from '../sim/statecraft/describers';
import { type GameState, type Unit, playerById } from '../sim/state';
import type { ResearchSnapshot } from '../sim/tech';
import { type TechId, type TechTrait, techDef, traitsReaching } from '../sim/techData';
import { type UnitTypeId, isRanged, unitDef, unitHp, unitMaxHp } from '../sim/unitData';
import { getTileAt } from '../sim/map';
import { unitHealthBonus } from '../sim/resourceEffects';

/** One trait that reaches a piece, with the label its lines carry. */
export interface UnitTraitReading {
  tech: TechId;
  trait: TechTrait;
  /** "Mechanics · Onager": the label `liveEffects` gives the trait's lines. */
  source: string;
}

/** The traits that reach this piece, in the order its owner learnt them. */
export function unitTraitReadings(state: GameState, unit: Unit): UnitTraitReading[] {
  const owner = playerById(state, unit.ownerId);
  if (owner === undefined) return [];
  return traitsReaching(owner.techsResearched, unit.type).map(({ tech, trait }) => ({
    tech,
    trait,
    source: `${techDef(tech).name} · ${trait.name}`,
  }));
}

/**
 * The piece's name with its traits after it: "Catapult · Onager". A piece with
 * no trait is just its type's name, as it always was.
 */
export function unitTitle(state: GameState, unit: Unit): string {
  const traits = unitTraitReadings(state, unit).map((reading) => reading.trait.name);
  return [unitDef(unit.type).name, ...traits].join(' · ');
}

/** One labelled line of a list on the unit card. */
export interface UnitLedgerLine {
  label: string;
  amount: number;
}

/** The fold of a unit card list. The only sum of one. */
export function foldUnitLedger(lines: readonly UnitLedgerLine[]): number {
  let total = 0;
  for (const line of lines) total += line.amount;
  return total;
}

/** What the unit card prints for a piece that has at least one trait. */
export interface UnitTraitLedger {
  /**
   * Strength, defending where it stands: the row's strength first, then one
   * line for each trait whose strength applies there. A line with a condition
   * the piece does not meet now (the Maryannu's blow on the wounded, which is
   * an attack) is not in the list; the trait's words say it.
   */
  strength: UnitLedgerLine[];
  /**
   * Range, for a ranged piece: the row's range, then each trait's range line,
   * then anything else the empire's cards add. `null` for a piece that does
   * not shoot.
   */
  range: UnitLedgerLine[] | null;
  /**
   * Each trait's rule, in the describers' words: one entry per trait, with the
   * trait's name for the card's heading ("Catapult · Onager"). The clauses are
   * composed here and printed by the unit card through `setDescriptorText`,
   * the one printer of a clause (`test/ui/keywords.test.ts`).
   */
  words: { source: string; name: string; clauses: CardClause[] }[];
}

/** Words for the range the empire's other cards add, beside the traits' own lines. */
export const OTHER_RANGE_LABEL = 'Your other cards';

/**
 * The unit card's lists for one piece, or `null` when no trait reaches it.
 *
 * `null` keeps the card exactly as it was for every piece without a trait,
 * which is nearly every piece in a game without the Scientific deck.
 */
export function unitTraitLedger(state: GameState, unit: Unit): UnitTraitLedger | null {
  const readings = unitTraitReadings(state, unit);
  if (readings.length === 0) return null;
  const def = unitDef(unit.type);

  const tile = getTileAt(state.map, unit.col, unit.row);
  const strength: UnitLedgerLine[] = [{ label: def.name, amount: def.combatStrength }];
  if (tile !== undefined) {
    const bonus = unitHealthBonus(state, unit.ownerId);
    // The piece defending on its own hex, against nobody in particular: the
    // reading a card at rest can honestly give. The forecast asks the same
    // function about a real fight.
    const situation: CombatSituation = {
      unit,
      side: 'defend',
      tile,
      vsBarbarians: false,
      vsCity: false,
      targetHp: unitHp(unit, bonus),
      targetMaxHp: unitMaxHp(unit, bonus),
    };
    for (const reading of readings) {
      let amount = 0;
      for (const effect of reading.trait.effects) {
        if (effect.kind !== 'combatLine') continue;
        amount += combatLineAmount(state, situation, effect) ?? 0;
      }
      if (amount !== 0) strength.push({ label: reading.source, amount });
    }
  }

  let range: UnitLedgerLine[] | null = null;
  if (isRanged(def)) {
    range = [{ label: def.name, amount: def.range ?? 0 }];
    let traitRange = 0;
    for (const reading of readings) {
      let amount = 0;
      for (const effect of reading.trait.effects) {
        // A trait's range line reaches its own line by construction, so only
        // the conditions a card may add are left to rule it out.
        if (effect.kind !== 'unitStat' || effect.stat !== 'range') continue;
        if (effect.where !== undefined || effect.rank !== undefined) continue;
        amount += effect.amount;
      }
      if (amount !== 0) range.push({ label: reading.source, amount });
      traitRange += amount;
    }
    // The rest of what the empire's cards add, so the list folds to the reach
    // a ranged attack actually measures (`def.range + cardUnitStat`).
    const others = cardUnitStat(state, unit, 'range') - traitRange;
    if (others !== 0) range.push({ label: OTHER_RANGE_LABEL, amount: others });
  }

  const words = readings.map((reading) => ({
    source: reading.source,
    name: reading.trait.name,
    clauses: describeTrait(reading.trait),
  }));
  return { strength, range, words };
}

/** One piece that gained a trait in a resolution, for the glow and the toast. */
export interface TraitGain {
  unitId: number;
  type: UnitTypeId;
  tech: TechId;
  trait: string;
  col: number;
  row: number;
}

/**
 * **The pieces that gained a line trait since the snapshot**, one entry per
 * piece and trait, in `state.units` order.
 *
 * `researchSince`'s own rule (`src/sim/tech.ts`), asked of each piece rather
 * than tallied: the traits its type holds now, less the ones its old type held
 * under the snapshot's technologies. A piece made since the snapshot gained
 * nothing; it was made with the trait. The tally (`ResearchReport.traits`)
 * says how many; this says which, so the board can glow each one and the toast
 * can pan to one of them.
 */
export function traitGainers(
  state: GameState,
  playerId: number,
  before: ResearchSnapshot,
): TraitGain[] {
  const player = playerById(state, playerId);
  if (player === undefined) return [];
  const wasType = new Map(before.units.map((unit) => [unit.id, unit.type]));
  const gains: TraitGain[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const from = wasType.get(unit.id);
    if (from === undefined) continue;
    const had = traitsReaching(before.techs, from);
    for (const { tech, trait } of traitsReaching(player.techsResearched, unit.type)) {
      if (had.some((old) => old.tech === tech && old.trait.name === trait.name)) continue;
      gains.push({ unitId: unit.id, type: unit.type, tech, trait: trait.name, col: unit.col, row: unit.row });
    }
  }
  return gains;
}
