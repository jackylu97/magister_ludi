/**
 * Barbarian camps as *state*: what stands where, and what burning one out is
 * worth.
 *
 * Deliberately a module of its own, below `barbarians.ts` rather than inside it,
 * and the reason is an import edge. The wild's behaviour has to attack through
 * the one combat evaluator, so `barbarians.ts` imports `combat.ts`; and clearing
 * a camp happens the moment a unit comes to rest on it, which is a thing
 * `combat.ts` (the advance after a kill) and `movement.ts` (the ordinary march)
 * both have to be able to do. Putting the camp registry here — with no knowledge
 * of combat, movement or the wild's opinions — is what lets `arrival.ts` sit
 * above both call sites without closing a cycle.
 *
 * So: this file knows what a camp *is*. `barbarians.ts` knows what camps *do*.
 *
 * The bounty is two windfalls, not one
 * ------------------------------------
 * Taking a camp pays `campClearGold` into the treasury and `campClearFood` into
 * the clearing empire's **nearest owned city** — the same "nearest owned city"
 * rule a ruin's grain cache lands by (`nearestOwnedCity` in `cities.ts`), asked
 * once and shared, because they are the same sentence and two implementations of
 * it would be two answers on a tie.
 *
 * Both halves are Entry XVIII windfalls: printed numbers, **modifier-immune**,
 * settled the instant they land. The food goes through `settleGrowthWindfall`, so
 * a camp cleared beside a full granary grows the town that turn rather than at
 * the next resolution.
 *
 * And a camp cleared by an empire with **no cities at all** — a raider caught
 * mid-migration, a player whose last town has fallen — collects the gold and
 * forfeits the food. That is the honest reading: there is nowhere for provisions
 * to go, and inventing a destination would be worse than saying so. The interface
 * says so (`arrival.ts` hands the warning to the announce line), and a test pins
 * it, because a silently-swallowed boon is the kind of thing nobody notices for a
 * hundred turns.
 */

import { nearestOwnedCity, settleGrowthWindfall } from './cities';
import {
  payWindfallGrants,
  settleCultureWindfall,
  windfallPayout,
  type WindfallPayout,
} from './statecraft';
import type { Cell } from './pathfind';
import { RULES } from './rulesData';
import { type BarbarianCamp, type GameState, playerById } from './state';
import type { UnitTypeId } from './unitData';

const BARB = RULES.barbarians;

/** The camp standing on a cell, or `null`. Camps are few; a linear scan is right. */
export function campAt(state: GameState, col: number, row: number): BarbarianCamp | null {
  for (const camp of state.camps) {
    if (camp.col === col && camp.row === row) return camp;
  }
  return null;
}

/** Is there a camp here? The question most callers actually have. */
export function hasCampAt(state: GameState, col: number, row: number): boolean {
  return campAt(state, col, row) !== null;
}

/**
 * Takes a camp off the board. Returns whether there was one.
 *
 * Spliced out of `state.camps` rather than flagged, because a cleared camp is
 * *gone* — nothing in the game asks where one used to be, and a tombstone would
 * be a second state for every consumer to skip.
 */
export function removeCampAt(state: GameState, col: number, row: number): boolean {
  const index = state.camps.findIndex((camp) => camp.col === col && camp.row === row);
  if (index < 0) return false;
  state.camps.splice(index, 1);
  return true;
}

/** What clearing a camp paid, for the line the interface announces it in. */
export interface CampBounty {
  gold: number;
  /**
   * Food actually banked — the camp's own provisions **plus** any rider's
   * food grant (Camp Followers' twenty-five bushels), folded into one honest
   * total. Zero when there was nowhere to bank it.
   */
  food: number;
  /** The city that received the provisions, or `null` when none did. */
  cityName: string | null;
  /** The size the city grew to on the spot, or `null`. */
  grownTo: number | null;
  /** Why the food was forfeited, or `null`. */
  warning: string | null;
  /**
   * Every rider that touched this occasion — Camp Followers', Spoils of the
   * Wild's, Wolf-Mother's Pact's — reused verbatim from `WindfallPayout.lines`
   * (Entry XVIII.5: a rider is part of the printed number, and this is the
   * record of what changed it). Empty when no card touched the occasion.
   */
  lines: WindfallPayout['lines'];
  /**
   * Military units a rider gifted outright that actually found ground to
   * stand on — Camp Followers' stray. A drawn-but-undelivered gift (no hex
   * free) is not in this list, matching what `payWindfallGrants` actually
   * realised.
   */
  units: { type: UnitTypeId; cityName: string }[];
}

/**
 * Pays the bounty for a camp `playerId` has just taken. Validates nothing — the
 * caller has already established that a camp stood here and that this unit is
 * standing on it; this is the mechanism.
 *
 * Entry XVIII.5 stands: the bounty is a **printed number**, paid exactly, with
 * no city percentages, no meter tiers and no staging. What Statecraft changes is
 * *what is printed* — Spoils of the Wild and Wolf-Mother's Pact scale the
 * figure, Camp Followers adds a voice the camp never paid at all — and
 * `windfallPayout` composes all of that into one number before a coin is banked.
 * A rider is part of the printed number; it is never a multiplication afterwards.
 */
export function settleCampBounty(
  state: GameState,
  playerId: number,
  at: Cell,
): CampBounty {
  const bounty: CampBounty = {
    gold: 0,
    food: 0,
    cityName: null,
    grownTo: null,
    warning: null,
    lines: [],
    units: [],
  };
  const player = playerById(state, playerId);
  if (!player) return bounty;

  // One payout for the whole occasion. The percentage riders scale the *gold*,
  // which is the camp's own figure; the grants are voices no camp pays on its
  // own and are banked below with the provisions.
  const payout = windfallPayout(state, playerId, 'camp', BARB.campClearGold);
  bounty.gold = payout.amount;
  bounty.lines = payout.lines;
  player.gold += bounty.gold;

  const city = nearestOwnedCity(state, playerId, at);
  if (!city) {
    // No town to feed. Said out loud rather than banked into nothing — see the
    // module docblock, and `test/sim/barbarians.test.ts`, which pins it.
    bounty.warning = 'no city to receive the provisions';
    // The grants that do not need a town — culture, science, faith — are still
    // paid: a card's verse about a burnt camp is not owed to a granary.
    payWindfallGrants(state, player, payout, at, bounty.units);
    settleCultureWindfall(state, player);
    return bounty;
  }

  // The camp's own provisions, scaled by the same percentage the gold was: a
  // rider that says "camps pay +50%" means the camp, not half of it.
  bounty.food = Math.floor((BARB.campClearFood * payout.amount) / Math.max(1, BARB.campClearGold));
  city.foodBasket += bounty.food;
  bounty.cityName = city.name;
  // Camp Followers' twenty-five bushels folded into the one printed figure —
  // the toast owes one honest total, never a base the player banked and a
  // rider it never heard about (`payWindfallGrants` banks this same amount
  // into the same basket below; this only makes the report agree with it).
  for (const grant of payout.grants) {
    if (grant.yield === 'food') bounty.food += grant.amount;
  }
  // Camp Followers' stray and anything else a rider grants, into the same
  // town the provisions went to (`nearestOwnedCity`, one rule); the pieces
  // that actually found ground land in `bounty.units` for the announcement.
  payWindfallGrants(state, player, payout, at, bounty.units);
  const grown = settleGrowthWindfall(state, city);
  if (grown) bounty.grownTo = grown.population;
  settleCultureWindfall(state, player);
  return bounty;
}
