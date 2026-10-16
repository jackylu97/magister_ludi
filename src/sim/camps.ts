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

import {
  claimTile,
  cityTile,
  nearestOwnedCity,
  refreshCityDerived,
  settleGrowthWindfall,
  settleProductionWindfall,
} from './cities';
import { getTileAt, mapRange, tileHex, wrappedDistance } from './map';
import {
  cardActionRule,
  payWindfallGrants,
  recordScalingOccasion,
  settleCultureWindfall,
  windfallPayout,
  type WindfallPayout,
} from './statecraft';
import type { Cell } from './pathfind';
import { RULES } from './rulesData';
import { type BarbarianCamp, type City, type GameState, playerById } from './state';
import type { UnitTypeId } from './unitData';
import { bumpEconomy } from './slate';
import { recomputeVisibility } from './visibility';

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
  // `barbarians.ts`' announcement, the other way round (batch M3, `slate.ts`).
  bumpEconomy(state);
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
 * **The Barbarian Frontier** (shared Dominion and Expansionist card, batch S,
 * the `campClaimsGround` rule): the cleared camp's hex and every unowned hex
 * beside it go to this empire's nearest town, if that town stands within
 * `frontierClaimTownRange` hexes of the camp.
 *
 * Only unowned hexes are taken (`claimTile` refuses an owned one), so this never
 * moves a border another town already drew. Like the citadel's claim, a hex may
 * end up further from its town than culture alone would reach. The town is
 * re-seated through `refreshCityDerived` (the register's entry 24) and the
 * empire's map redrawn, because ground it now owns is ground it can see.
 *
 * Returns the town that gained ground, or `null` when nothing was claimed.
 */
export function claimClearedCampGround(
  state: GameState,
  playerId: number,
  at: Cell,
): City | null {
  if (!cardActionRule(state, playerId, 'campClaimsGround')) return null;
  const centre = getTileAt(state.map, at.col, at.row);
  if (!centre) return null;
  const seat = nearestOwnedCity(state, playerId, at);
  if (!seat) return null;
  const reach = wrappedDistance(state.map, tileHex(centre), tileHex(cityTile(state.map, seat)));
  if (reach > BARB.frontierClaimTownRange) return null;
  let claimed = 0;
  // `mapRange` walks in map order, so two hexes are always claimed in the same
  // order for every replay.
  for (const tile of mapRange(state.map, tileHex(centre), 1)) {
    if (claimTile(state, seat, tile)) claimed += 1;
  }
  if (claimed === 0) return null;
  recomputeVisibility(state, playerId);
  refreshCityDerived(state, seat);
  return seat;
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
  // **The march's own chronicle** — The Pacified Marches, written where the
  // camp is burnt out and beside `Player.campsCleared`, which is the lifetime
  // record the same deed feeds (`CountKind`'s `clearedCamps`). Two counters of
  // one act, because a card in a chair and a record on the player answer
  // different questions — `goldSpent`'s pair, one occasion over.
  recordScalingOccasion(state, playerId, 'campCleared');
  bounty.gold = payout.amount;
  bounty.lines = payout.lines;
  player.gold += bounty.gold;
  // The banks are a line of the meters too (batch M3, `slate.ts`).
  bumpEconomy(state);
  // The Barbarian Frontier's claim, before the provisions are paid, so a town
  // that gains a hex here is re-seated before it is fed.
  claimClearedCampGround(state, playerId, at);

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
  const touched = payWindfallGrants(state, player, payout, at, bounty.units);
  const grown = settleGrowthWindfall(state, city);
  if (grown) bounty.grownTo = grown.population;
  // **Every town a grant fed settles at once**, not only the town fed above
  // (the follow-up to Dominion batch D3): The Outriders pay hammers to every
  // town. Food first, through `settleGrowthWindfall`, which settles the
  // hammers too when the town grows; otherwise the hammers alone.
  for (const town of touched) {
    if (town === city) {
      if (!grown) settleProductionWindfall(state, town);
    } else if (!settleGrowthWindfall(state, town)) {
      settleProductionWindfall(state, town);
    }
  }
  settleCultureWindfall(state, player);
  return bounty;
}
