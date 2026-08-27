/**
 * Triumphs: the lumpy half of the renown bucket, and **the one new hook shape**
 * this whole pass adds (`docs/great-people.md`).
 *
 * One `switch`, in one file
 * -------------------------
 * A triumph row names a *trigger kind* (`triumphData.ts`), and the only place in
 * the game that switches on one is `standingHolds` below. That is the same claim
 * `statecraft.ts` makes for a `CardEffect.kind` and `resourceEffects.ts` for a
 * luxury's signature, made a fourth time, and it buys the same thing: **a new
 * triumph is a JSON row**. Every seam below calls `awardOccasion` with a kind
 * and knows nothing else about the system.
 *
 * Two kinds of trigger, two ways of asking
 * ----------------------------------------
 *   · An **occasion** is announced. Ten seams already exist for the ten things
 *     the doc's table cares about — a city founded, a wonder finished, a camp
 *     burnt out, a ruin read, a government adopted, a god named, a fight won, a
 *     city taken, an era entered — and each of them calls `awardOccasion` in the
 *     *mechanism* rather than in the reducer, so an AI earns its triumphs too.
 *   · A **standing count** is swept. "A city of yours reaches population 10" is
 *     a fact about the board, not an event; the renown phase asks all four of
 *     them once a turn from state, which is simpler than four more hooks and
 *     cannot miss a city that starved back to nine and grew again.
 *
 * The news is a **diff**, never a sink
 * ------------------------------------
 * `Player.triumphs` is append-only and every entry is stamped with the turn it
 * was earned on, so what a command awarded is the slice past the length it
 * started at (`triumphsAwarded`), and what a resolution awarded is the same
 * slice taken across every seat (`triumphsSince`). That is why not one of the
 * ten seams below grew a parameter: threading an out-list through
 * `foundCityAt` → `realiseItem` → `settleProduction` → `advanceProduction` would
 * have been nine signatures and nine chances to drop one, to carry a fact the
 * state already records. `arriveOnTile` reports rather than announces; this is
 * the same idea for something that happens in ten places instead of two.
 *
 * Scope, and how contention is settled
 * ------------------------------------
 * `once` and `perAge` are enforced against the empire's own list; `contested` is
 * enforced against `GameState.contested`, the world's register, so "the first
 * seat by log and sweep order" is a property of the order commands were applied
 * in rather than of a check somebody could forget. A **deferred** row is never
 * awarded at all — it is in the table so the hover can print the whole list
 * greyed, which is what the doc asks for.
 */

import { controlledHoldings } from './cities';
import type { Family } from './greatPeopleData';
import { tileIndex } from './map';
import { landRegions } from './resources';
import type { RenownGrant } from './renown';
import { settleRenownWindfall } from './renown';
import {
  type City,
  type EarnedTriumph,
  type GameState,
  type Player,
  playerById,
} from './state';
import { highestAge } from './techData';
import {
  TRIUMPH_IDS,
  type TriumphId,
  type TriumphTriggerKind,
  triumphDef,
} from './triumphData';
import { isWonder } from './buildingData';

/**
 * The trigger kinds a *seam* announces — everything that is not a standing
 * count and is not deferred.
 *
 * A type of its own so a seam names one and cannot accidentally announce
 * `cityPopulation`, which nothing announces because nothing has to.
 */
export type TriumphOccasion = Extract<
  TriumphTriggerKind,
  | 'cityFounded'
  | 'ageEntered'
  | 'wonderCompleted'
  | 'battleWonAgainstStronger'
  | 'campCleared'
  | 'discoveryClaimed'
  | 'governmentAdopted'
  | 'beliefConsecrated'
  | 'cityOnOtherContinent'
  | 'cityCaptured'
>;

/** What an award did, for the line the interface announces it in. */
export interface TriumphAward {
  id: TriumphId;
  name: string;
  /** Renown paid, which is already banked by the time anybody reads this. */
  pays: number;
  family: Family | null;
  playerId: number;
  turn: number;
  /** The age it was earned in, on the scopes that count per era. */
  age?: number;
}

// --- scope ------------------------------------------------------------------

/**
 * Has this empire already earned this row, at this age?
 *
 * The whole of `once` and `perAge`, asked of the empire's own list; `contested`
 * is asked of the world's register instead, and `perEvent` is never barred.
 */
function alreadyEarned(state: GameState, player: Player, id: TriumphId, age: number): boolean {
  const scope = triumphDef(id).scope;
  switch (scope) {
    case 'once':
      return player.triumphs.some((earned) => earned.id === id);
    case 'perAge':
      return player.triumphs.some((earned) => earned.id === id && earned.age === age);
    case 'contested':
      // The world's, not the seat's: once anybody has it for this era, nobody
      // else ever can. `state.contested` is the register and this is its reader.
      return state.contested.some((claim) => claim.id === id && claim.age === age);
    case 'perEvent':
      return false;
    default: {
      const unhandled: never = scope;
      void unhandled;
      return true;
    }
  }
}

/**
 * Awards one triumph to one empire, if its scope allows it. **The** one place a
 * triumph is earned, and the only writer of `Player.triumphs` and
 * `GameState.contested`.
 *
 * Everything it does is in one order and each line is a rule: the scope is
 * checked, the record is written (which is what makes the *next* check refuse),
 * the world's register is written for a contested row, and the renown is paid
 * through `settleRenownWindfall` — the bucket's own seam, so a triumph that
 * fills the ladder opens a great-person offer before this returns, exactly as a
 * chop that fills a queue completes it.
 *
 * A **deferred** row is refused outright. It is in the table so the hover can
 * print it greyed, and awarding one would be the game paying for a rule it has
 * not written.
 *
 * The wild earns nothing: it has no screen, no pools and no use for a name.
 */
export function awardTriumph(
  state: GameState,
  playerId: number,
  id: TriumphId,
): TriumphAward | null {
  const player = playerById(state, playerId);
  if (!player || player.barbarian) return null;
  const def = triumphDef(id);
  if (def.deferred !== undefined) return null;

  const age = highestAge(player.techsResearched);
  if (alreadyEarned(state, player, id, age)) return null;

  const earned: EarnedTriumph = { id, turn: state.turn };
  // Stamped only on the scopes that count per era, so a `once` row in a save
  // serialises as small as it reads.
  if (def.scope === 'perAge' || def.scope === 'contested') earned.age = age;
  player.triumphs.push(earned);
  if (def.scope === 'contested') {
    state.contested.push({ id, playerId: player.id, age, turn: state.turn });
  }

  const grant: RenownGrant = { family: def.family ?? null, amount: def.pays };
  settleRenownWindfall(state, player, [grant]);

  const award: TriumphAward = {
    id,
    name: def.name,
    pays: def.pays,
    family: def.family ?? null,
    playerId: player.id,
    turn: state.turn,
  };
  if (earned.age !== undefined) award.age = earned.age;
  return award;
}

// --- the occasions ----------------------------------------------------------

/**
 * Awards every live row whose trigger is this occasion. **The** call every seam
 * makes, and the reason a seam knows nothing about triumphs beyond a word.
 *
 * Rows are walked in `TRIUMPH_IDS` order — file order, an order the data carries
 * — so two rows on one occasion always resolve the same way.
 *
 * `count` is the one thing an occasion may need beyond its name: "your third
 * city is founded" is a question about the board asked *at* the founding, so the
 * seam hands in what it already knows and the row's own threshold is compared
 * against it. An occasion with no count passes nothing and the clause is skipped.
 */
export function awardOccasion(
  state: GameState,
  playerId: number,
  occasion: TriumphOccasion,
  count?: number,
): TriumphAward[] {
  const awards: TriumphAward[] = [];
  for (const id of TRIUMPH_IDS) {
    const when = triumphDef(id).when;
    if (when.kind !== occasion) continue;
    if ('count' in when && (count === undefined || count < when.count)) continue;
    const award = awardTriumph(state, playerId, id);
    if (award) awards.push(award);
  }
  return awards;
}

// --- the standing counts ----------------------------------------------------

/**
 * Does this standing count hold for this empire right now?
 *
 * **The one `switch` on a trigger kind in the game.** Every arm is a plain read
 * of the board, and the arms that are not standing counts answer `false` rather
 * than throwing — an occasion is announced, never swept, and a deferred row is
 * refused a rung higher in `awardTriumph`. The aliased-discriminant idiom, so the
 * day a kind is added this stops compiling until somebody has decided which half
 * it belongs to.
 */
function standingHolds(state: GameState, playerId: number, id: TriumphId): boolean {
  const when = triumphDef(id).when;
  const kind = when.kind;
  switch (kind) {
    case 'cityPopulation': {
      for (const city of state.cities) {
        if (city.ownerId === playerId && city.population >= when.count) return true;
      }
      return false;
    }
    case 'cityCount':
      return citiesOf(state, playerId).length >= when.count;
    case 'luxuriesImproved': {
      // *Improved*, not merely held: a luxury a city stands on pays the empire
      // but nobody dug it out, and the row's own text says "improved".
      let improved = 0;
      for (const holding of controlledHoldings(state, playerId, 'luxury')) {
        if (holding.via === 'improvement') improved += 1;
      }
      return improved >= when.count;
    }
    case 'wondersInOneCity': {
      for (const city of citiesOf(state, playerId)) {
        let wonders = 0;
        for (const building of city.buildings) {
          if (isWonder(building)) wonders += 1;
        }
        if (wonders >= when.count) return true;
      }
      return false;
    }
    // Announced at a seam, never swept. See `awardOccasion`.
    case 'cityFounded':
    case 'ageEntered':
    case 'wonderCompleted':
    case 'battleWonAgainstStronger':
    case 'campCleared':
    case 'discoveryClaimed':
    case 'governmentAdopted':
    case 'beliefConsecrated':
    case 'cityOnOtherContinent':
    case 'cityCaptured':
    // Deferred, and refused a rung higher. Here so the switch stays exhaustive.
    case 'unitLostThenWon':
    case 'firstNavalUnit':
    case 'citiesConnected':
      return false;
    default: {
      const unhandled: never = kind;
      void unhandled;
      return false;
    }
  }
}

/**
 * Claims every standing triumph this empire now qualifies for. Called once per
 * turn by the renown phase.
 *
 * In `TRIUMPH_IDS` order, so two thresholds crossed in the same turn are always
 * claimed in the same order and the renown they pay lands in the same order —
 * which matters, because either of them may be the one that fills the ladder.
 */
export function awardCountTriumphs(state: GameState, playerId: number): TriumphAward[] {
  const awards: TriumphAward[] = [];
  for (const id of TRIUMPH_IDS) {
    if (!standingHolds(state, playerId, id)) continue;
    const award = awardTriumph(state, playerId, id);
    if (award) awards.push(award);
  }
  return awards;
}

// --- the seams' helpers -----------------------------------------------------

/** This empire's cities, in `state.cities` order — founding order. */
function citiesOf(state: GameState, playerId: number): City[] {
  return state.cities.filter((city) => city.ownerId === playerId);
}

/**
 * Everything a **founding** may earn: the third hearth, and the far shore.
 *
 * One call from `foundCityAt` rather than two, because both questions are asked
 * of the same moment and a seam should name an occasion rather than a list of
 * them. The continent test is the interesting half — see `onOtherContinent`.
 */
export function awardFoundingTriumphs(state: GameState, city: City): TriumphAward[] {
  const awards = awardOccasion(
    state,
    city.ownerId,
    'cityFounded',
    citiesOf(state, city.ownerId).length,
  );
  if (onOtherContinent(state, city)) {
    awards.push(...awardOccasion(state, city.ownerId, 'cityOnOtherContinent'));
  }
  return awards;
}

/**
 * Is this town on a landmass its empire did not start on?
 *
 * Asked of `landRegions` — the map's own connected land components, a pure
 * function of the board with no generator and no config behind it — against the
 * region the empire's **oldest** city stands on, which is where it started. The
 * first city is on its own continent by definition, so a one-city empire never
 * earns this.
 *
 * `carveContinents` is the richer answer and is deliberately not used: it wants a
 * `ResourceConfig` this module has no business holding, and "a continent you did
 * not start on" is a question about *reachability by land*, which is exactly what
 * a connected component is.
 */
function onOtherContinent(state: GameState, city: City): boolean {
  const own = citiesOf(state, city.ownerId);
  const first = own[0];
  if (!first || first.id === city.id) return false;
  const regions = landRegions(state.map);
  const home = regions[tileIndex(state.map, first.col, first.row)];
  const here = regions[tileIndex(state.map, city.col, city.row)];
  if (home === undefined || here === undefined || home < 0 || here < 0) return false;
  return home !== here;
}

// --- the news ---------------------------------------------------------------

/**
 * The awards past a remembered length of one empire's list — **the diff a
 * command reports**.
 *
 * See the module docblock: `Player.triumphs` is append-only, so a handler that
 * remembers `player.triumphs.length` before running a mechanism can slice
 * exactly what that mechanism earned, whatever depth it earned it at. Cheaper
 * and less forgettable than a sink threaded through nine signatures, and it
 * cannot report a triumph twice.
 */
export function triumphsAwarded(player: Player, from: number): TriumphAward[] {
  const awards: TriumphAward[] = [];
  for (let i = Math.max(0, from); i < player.triumphs.length; i++) {
    const earned = player.triumphs[i]!;
    const def = triumphDef(earned.id);
    const award: TriumphAward = {
      id: earned.id,
      name: def.name,
      pays: def.pays,
      family: def.family ?? null,
      playerId: player.id,
      turn: earned.turn,
    };
    if (earned.age !== undefined) award.age = earned.age;
    awards.push(award);
  }
  return awards;
}

/**
 * The same diff across **every** seat — what a whole resolution earned.
 *
 * `lengths` is one remembered length per player id, taken before the pipeline
 * ran. Walked in `state.players` order so the report is in seat order however
 * many empires earned something.
 */
export function triumphsSince(state: GameState, lengths: readonly number[]): TriumphAward[] {
  const awards: TriumphAward[] = [];
  for (const player of state.players) {
    awards.push(...triumphsAwarded(player, lengths[player.id] ?? 0));
  }
  return awards;
}

/** One remembered length per player id. The other half of `triumphsSince`. */
export function triumphMarks(state: GameState): number[] {
  return state.players.map((player) => player.triumphs.length);
}
