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
 * a statement of *order* rather than a second home for city rules. Milestone 4
 * fills in `advanceResearch`, whose body lives in `tech.ts` for the same reason,
 * and leaves it in the position it was always reserved.
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
 * `advanceResearch` sits after production and before the units are touched, and
 * both sides of that matter: this turn's science was banked by `collectYields`
 * at the top, so a tech completes on the turn its beakers arrived rather than
 * the turn after; and a unit that auto-upgrades here is retyped *before*
 * `healUnits` and `resetMovement` read it, so it heals and refills as the unit
 * it now is.
 *
 * One phase sweeps every city before the next phase begins. That is the whole
 * design of the pipeline: a rule is applied to the empire, not to a city, so no
 * city can ever be a turn ahead of its neighbour because it was founded first.
 *
 * `healUnits` runs *before* `resetMovement` and that is the design, not an
 * accident of the array: "did this unit act?" is answered by its movement still
 * being untouched, so healing has to be read before the allowance is refilled.
 * Swapping the two would heal every unit on the board, every turn, forever.
 * Milestone 5 gives `resetMovement` a second thing to clear — `hasAttacked` —
 * and it is the same argument twice: a unit that fought is not resting, so the
 * flag has to survive until healing has read it.
 *
 * Milestone 5's two additions sit where they do for reasons of their own.
 * `healCities` is a sibling of `healUnits` rather than part of it, because a
 * city heals unconditionally and a unit does not — one rule each, in one place
 * each. `advanceFortify` follows the healing so that "has this unit been still
 * all turn?" is asked once, of one board state, by both.
 *
 * Entry XX adds one phase, `barbarians`, between `healCities` and `healUnits`,
 * and its position is that same argument read once more: the wild acts *after*
 * the towns have had their turn, so a raid meets the world this turn produced,
 * and *before* the healing, so a raider that marched or fought is not resting —
 * exactly like every other unit on the board. See `barbarianTurn`.
 *
 * There is deliberately no elimination phase
 * ------------------------------------------
 * A player is out when they hold no units and no cities, and in v1 the *only*
 * thing that can bring that about is an attack: cities are never destroyed
 * (starvation floors population at 1, and a captured city changes owner rather
 * than vanishing), and the only other way a unit leaves the board is a settler
 * spending itself on a city — which leaves its owner holding that city. So
 * `updateElimination` is called from inside `applyCombat`, where the loss
 * actually happens, and nowhere else.
 *
 * That is not only economy, it is the correct place. Under simultaneous turns a
 * player wiped out mid-window has not ended their turn, and a verdict that
 * waited for the end of the turn would leave the window waiting for a seat with
 * nothing left to do. Deciding it inline closes the seat the instant it empties.
 *
 * The day something else can empty a player — razing a city, a plague, a
 * scenario that disbands an army — that rule calls `updateElimination` too, or
 * this array grows a phase. Adding one *now* would be a phase that could only
 * ever fire on a hand-edited state, which is a phase no test can honestly cover.
 */

import { barbarianTurn } from './barbarians';
import { advanceProduction, collectYields, expandBorders, growCities } from './cities';
import { advanceFortify, healCities } from './combat';
import { advanceAlongPath } from './movement';
import { advanceResearch } from './tech';
import type { GameState } from './state';
import { unitDef } from './unitData';
import { fullMovement, isRested } from './units';
import { RULES } from './rulesData';
import { recomputeAllVisibility } from './visibility';

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
    // Spends `Player.sciencePool` on the tech it is aimed at, and marches the
    // army up its upgrade chains the moment one lands.
    run: advanceResearch,
  },
  {
    name: 'expandBorders',
    // Culture buys the next tile for each city, best-scoring first.
    run: expandBorders,
  },
  {
    name: 'healCities',
    // Towns recover unconditionally, unlike units: there is no "did it act?"
    // question to ask of a city. Its body is in `combat.ts`, beside the rules
    // that spend the hit points it restores.
    run: healCities,
  },
  {
    name: 'barbarians',
    // The wild founds camps, musters bands and raids — after the towns have had
    // their turn, so a raid is resolved against the world this turn produced, and
    // *before* `healUnits`, so a raider that marched or fought is not resting.
    // The full argument for the position is in `barbarianTurn`'s docblock; it is
    // a rules decision, exactly like every other entry in this array.
    run: barbarianTurn,
  },
  {
    name: 'healUnits',
    // Units that spent nothing this turn recover; anyone who marched or fought
    // does not. Reads `movesLeft` and `hasAttacked`, so it must run before
    // `resetMovement` clears both — and after `barbarians`, so the question is
    // asked of the raiders too.
    run: healUnits,
  },
  {
    name: 'advanceFortify',
    // Everybody still dug in digs a little deeper. After `healUnits`, because
    // fortifying and resting are different questions and a unit that fortified
    // this turn has still been standing still all of it.
    run: advanceFortify,
  },
  {
    name: 'resetMovement',
    // Refills every allowance, clears `hasAttacked`, then walks standing orders
    // with the new points.
    run: resetMovement,
  },
  {
    name: 'refreshVisibility',
    // Last, and unconditionally, for every seat.
    //
    // Every *individual* mutation already refreshes the empire it belongs to —
    // a unit is created, killed, moved, a border grows — so this phase is not
    // where fog is normally maintained. It is here because the resolution is the
    // one moment several of those happen at once and one of them is a standing
    // order resumed by the phase directly above: a unit that marched during
    // `resetMovement` did so inside a phase, not inside a command, and the
    // cheapest honest way to be sure nobody's map is a turn stale is to redraw
    // all of them once the world has stopped moving.
    //
    // Its position is therefore not negotiable: it must be after every phase
    // that can move a piece, claim a tile or retype a unit, which is all of them.
    run: recomputeAllVisibility,
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
  for (const unit of state.units) {
    unit.movesLeft = fullMovement(unit);
    // The same allowance, refilled in the same breath: one attack per unit per
    // turn, and this is the turn ending. It is cleared *after* `healUnits` has
    // read it, which is the whole reason that phase comes first.
    unit.hasAttacked = false;
  }
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
