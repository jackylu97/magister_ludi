/**
 * The end-of-turn resolution pipeline.
 *
 * When the last outstanding player ends their turn the world moves: cities eat
 * and grow, production and research tick over, borders creep outward, units heal
 * and get their movement back. Those effects are not independent — a city that
 * starves this turn must not also have grown, and borders must expand before the
 * next turn's yields are collected — so the *order* is the design, and it lives
 * here as one explicit array rather than being scattered across the modules that
 * eventually implement each step.
 *
 * Every phase is `(state) => void` and mutates the state in place, exactly like
 * the reducer that calls it (see `commands.ts`). Phases never roll their own
 * randomness source; if one needs a die it uses `state.rng`.
 *
 * Milestone 2 laid the skeleton and the two unit phases; Milestone 3 fills in
 * the four city phases, whose bodies live in `cities.ts` so that this file stays
 * a statement of *order* rather than a second home for city rules.
 * `advanceResearch` remains a stub for Milestone 4.
 *
 * Why this order
 * --------------
 * `collectYields` first, because everything downstream spends what it banks.
 * `growCities` before `advanceProduction`, so a city that grows this turn is the
 * larger city when its settler's `minCityPop` is checked. `expandBorders` last
 * of the city phases, so a tile claimed this turn is worked *next* turn — a
 * border that expanded and was immediately harvested would pay twice for one
 * turn's culture.
 *
 * One phase sweeps every city before the next phase begins. That is the whole
 * design of the pipeline: a rule is applied to the empire, not to a city, so no
 * city can ever be a turn ahead of its neighbour because it was founded first.
 *
 * `healUnits` runs *before* `resetMovement` and that is the design, not an
 * accident of the array: "did this unit act?" is answered by its movement still
 * being untouched, so healing has to be read before the allowance is refilled.
 * Swapping the two would heal every unit on the board, every turn, forever.
 */

import { advanceProduction, collectYields, expandBorders, growCities } from './cities';
import { advanceAlongPath } from './movement';
import type { GameState } from './state';
import { unitDef } from './unitData';
import { fullMovement, isRested } from './units';
import { RULES } from './rulesData';

export interface TurnPhase {
  /** Stable identifier, used by tests and (later) by the turn-log UI. */
  name: string;
  run: (state: GameState) => void;
}

/**
 * The phases, in the order they resolve. Insert new phases deliberately: the
 * position of a phase in this array is a rules decision.
 */
export const END_OF_TURN_PHASES: readonly TurnPhase[] = [
  {
    name: 'collectYields',
    // Re-assigns citizens, then banks food, hammers, gold, science and culture.
    run: collectYields,
  },
  {
    name: 'growCities',
    // Spends a full food basket on a population point, or starves one away.
    run: growCities,
  },
  {
    name: 'advanceProduction',
    // Completes at most one item per city, carrying the overflow forward.
    run: advanceProduction,
  },
  {
    name: 'advanceResearch',
    // Milestone 4: spend `Player.sciencePool` on the current tech.
    run: (_state: GameState): void => {},
  },
  {
    name: 'expandBorders',
    // Culture buys the next tile for each city, best-scoring first.
    run: expandBorders,
  },
  {
    name: 'healUnits',
    // Units that spent nothing this turn recover; anyone who marched does not.
    // Reads `movesLeft`, so it must run before `resetMovement` refills it.
    run: healUnits,
  },
  {
    name: 'resetMovement',
    // Refills every allowance, then walks standing orders with the new points.
    run: resetMovement,
  },
];

/**
 * Restores `healing.perTurnIfRested` to every unit that did not spend a single
 * movement point this turn, capped at the type's maximum.
 */
function healUnits(state: GameState): void {
  const amount = RULES.healing.perTurnIfRested;
  for (const unit of state.units) {
    if (!isRested(unit)) continue;
    const { maxHp } = unitDef(unit.type);
    if (unit.hp >= maxHp) continue;
    unit.hp = Math.min(maxHp, unit.hp + amount);
  }
}

/**
 * Refills movement, then resumes standing orders.
 *
 * Two passes, and the order matters: every unit is refilled *before* anyone
 * moves, so a unit stepping aside frees its tile for a unit resuming later in
 * the array with a full allowance rather than a stale one. Within the second
 * pass units are walked in `state.units` order, which is part of the state — so
 * two units whose orders contend for the same tile always resolve the same way.
 */
function resetMovement(state: GameState): void {
  for (const unit of state.units) unit.movesLeft = fullMovement(unit);
  for (const unit of state.units) {
    const path = unit.path;
    if (!path) continue;
    if (path.length === 0) {
      // Only reachable from a hand-edited save; an idle unit has no `path` key.
      delete unit.path;
      continue;
    }
    advanceAlongPath(state, unit, path);
  }
}

/**
 * Runs every phase in order. Called by the `endTurn` command once the last
 * outstanding seat has finished, before the flags are cleared and the turn
 * counter advances — so a phase still sees the turn that is ending in
 * `state.turn`, and sees every player marked as having ended it.
 */
export function runEndOfTurn(state: GameState): void {
  for (const phase of END_OF_TURN_PHASES) phase.run(state);
}
