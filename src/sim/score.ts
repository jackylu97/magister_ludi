import { standingCardCombatLines } from './statecraft/evaluator';
import { rankStrengthLines } from './ranks';
import { isCombatant, unitDef } from './unitData';
import { BUILDING_IDS, buildingDef, type BuildingId } from './buildingData';
import { foldDeckLedger } from './ledgerFold';
import { CITY_YIELD_KEYS, type CityYieldKey } from './resourceData';
import { RULES } from './rulesData';
import { citiesOf, playerById, wondersHeldBy, type GameState } from './state';
import { highestAge } from './techData';

/**
 * One line of a score: what it counts, how many, what one is worth, and the
 * product.
 *
 * `label` carries **no figure** — hard rule 7, and the reason the count and the
 * weight are their own fields: the sheet prints them in the ledger's own tabular
 * columns ("Towns held · 7 · ×12 · 84"), where a number belongs, rather than in
 * a sentence, where it does not.
 */
export interface ScoreLine {
  /** What was counted, in a first-time player's words. */
  label: string;
  /** How many of it there are. Zero is a real answer and still prints. */
  count: number;
  /** What one is worth — a figure off `rules.score` and never off this file. */
  weight: number;
  /** `count × weight`, floored. The only arithmetic on a line. */
  value: number;
  /**
   * The voice, on the six lines the deck pays and on nothing else.
   *
   * A **marker**, so the sheet's "what your statecraft paid" line can find those
   * six without reading their labels — a label is words, and words are the one
   * thing on this list that is allowed to be rewritten.
   */
  voice?: CityYieldKey;
}

/**
 * The wonder that ends the game, off its own marker.
 *
 * `undefined` is a table with no closing wonder in it, which is not a state any
 * shipped build is in — and is still answered rather than thrown over, because a
 * score is read on a screen and a screen that throws is worse than a score with
 * one line missing.
 */
export function opusBuildingId(): BuildingId | undefined {
  return BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true);
}

/** `count × weight`, with the count taken as whole. */
function line(label: string, count: number, weight: number): ScoreLine {
  const whole = Math.floor(count);
  return { label, count: whole, weight, value: Math.floor(whole * weight) };
}

/** The voice's own word, capitalised for the head of a label. */
function voiceLabel(key: string): string {
  return `${key.charAt(0).toUpperCase()}${key.slice(1)} from cards in play`;
}

/** Each military unit contributes the strength it can use in every fight. */
export function standingArmyStrength(state: GameState, playerId: number): number {
  let total = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const def = unitDef(unit.type);
    if (!isCombatant(def)) continue;
    total += def.combatStrength;
    for (const rank of rankStrengthLines(unit)) total += rank.amount;
    for (const line of standingCardCombatLines(state, unit)) total += line.amount;
  }
  return total;
}

/** Both counts survive the removal of the unit or camp from the board. */
export function rivalUnitsAndCampsDefeated(state: GameState, playerId: number): number {
  const player = playerById(state, playerId);
  return (player?.unitsKilled ?? 0) + (player?.campsCleared ?? 0);
}

/** Calibration can reprice a saved army and defeat count with the score sheet's rounding. */
export function militaryScoreLines(defeats: number, army: number, weights: { perDefeat: number; perArmyStrength: number }): ScoreLine[] {
  return [
    line('Rival units and camps defeated', defeats, weights.perDefeat),
    line('Army strength', army, weights.perArmyStrength),
  ];
}

/** Score each empire result and each lifetime yield separately so the score
 * sheet can show how every point was earned. Candidate weights let bot
 * calibration use the same calculation as the score sheet. */
export function explainScore(
  state: GameState,
  playerId: number,
  proposedWeights?: { perDefeat: number; perArmyStrength: number },
): ScoreLine[] {
  const setup = state.wagerBook?.setup;
  proposedWeights ??= setup?.mode === 'calibrated' ? setup.calibration.weights : undefined;
  const rules = RULES.score;
  const player = playerById(state, playerId);
  const towns = citiesOf(state, playerId);
  let citizens = 0;
  for (const town of towns) citizens += town.population;

  const opus = opusBuildingId();
  // **The stones, not a claim register.** The Opus is a once-per-empire culture
  // row rather than a `wonder: true` one (`data/buildings.json`), so
  // `claimWonder` never writes it into `GameState.wonders` and there is no
  // history of who raised it to read. So the line follows the stones, which is
  // the rule every other building's pay already follows — and the close itself
  // is unaffected either way: `state.winnerId` is the *builder*, written once
  // by `closeTheGreatWork` and never moved by a conquest afterwards.
  const holdsTheOpus =
    opus !== undefined && towns.some((town) => town.buildings.includes(opus));

  const lines: ScoreLine[] = [
    line('Towns held', towns.length, rules.perTown),
    line('Citizens', citizens, rules.perCitizen),
    line('Technologies', player?.techsResearched.length ?? 0, rules.perTechnology),
    line('Wonders raised or held', wondersHeldBy(state, playerId), rules.perWonder),
    line('Great people called', player?.greatPeopleRecruited ?? 0, rules.perGreatPerson),
    line('Towns taken by force', player?.citiesCaptured ?? 0, rules.perTownTaken),
    line('The age reached', highestAge(player?.techsResearched ?? []), rules.perAge),
    line(
      opus === undefined ? 'The great work' : buildingDef(opus).name,
      holdsTheOpus ? 1 : 0,
      rules.theOpus,
    ),
  ];

  // Calibration can price the two new readings before their weights enter the rules.
  if (proposedWeights) {
    lines.push(...militaryScoreLines(rivalUnitsAndCampsDefeated(state, playerId), standingArmyStrength(state, playerId), proposedWeights));
  }
  const tally = foldDeckLedger([
    ...(player?.statecraft.yieldTallies ?? []),
    ...(player?.statecraft.inPlayYieldTallies ?? []),
  ]);
  for (const key of CITY_YIELD_KEYS) {
    lines.push({
      ...line(voiceLabel(key), tally[key], rules.perDeckYield[key]),
      voice: key,
    });
  }
  return lines;
}

/** The one sum of that list, and the only figure the sheet prints at its foot. */
export function foldScore(lines: readonly ScoreLine[]): number {
  let total = 0;
  for (const entry of lines) total += entry.value;
  return total;
}
