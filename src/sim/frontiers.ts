/**
 * **The ten-turn moves of the Expansionist frontier** (batch E4 of
 * `docs/plans/expansionist-build-triage.md`): The Encroaching Fields takes a hex
 * from a smaller foreign town, Migration sends a citizen from the largest town
 * to a small one, and The Great Migration draws citizens from foreign towns
 * near the borders.
 *
 * Two end-of-turn phases run them, `encroachment` and `migration` (`turn.ts`),
 * after `expandBorders`. So the borders, the worked hexes and the happiness they
 * read are the ones this turn left. Each card fires on the turns where
 * `turn % every === 0`, the world's calendar the periodic musters keep, so no
 * countdown needs ticking. Every sweep is in `realPlayers` order, then card
 * order, then founding order, so a replay reproduces every move.
 *
 * Every town that gains or loses a hex or a citizen is re-seated at once
 * (`refreshCityDerived`): entries 28 and 29 of the register of mid-turn yield
 * changes (`cities.ts`).
 */

import {
  cityAt,
  cityTile,
  loseCitizen,
  nearestOwnedCity,
  refreshCityDerived,
  settlePopulationWindfall,
  withinReachOfBorders,
} from './cities';
import { type Tile, neighborTiles, tileHex, tileIndex, wrappedDistance } from './map';
import { happinessOf } from './meters';
import { connectedCities } from './roads';
import { bumpEconomy } from './slate';
import { type City, type GameState, type Player, cityById, citiesOf, realPlayers } from './state';
// Straight from the evaluator rather than through the index, as `census.ts`
// takes its names: the index re-exports across a cycle, and the build splits
// such re-exports into chunks it warns about.
import { effectsOfKind } from './statecraft/evaluator';
import { recomputeVisibilityFor } from './visibility';

/** Does a card that fires every `every` turns fire on this one? */
function firesNow(state: GameState, every: number): boolean {
  const period = Math.floor(every);
  return period > 0 && state.turn % period === 0;
}

// --- The Encroaching Fields --------------------------------------------------

/**
 * The `encroachment` phase: **each large town takes one hex from a smaller
 * foreign town beside it** (The Encroaching Fields; the triage's reading 38).
 * See `CardEncroachEffect` for the rule, and `hexToTake` for which hex.
 *
 * The hex changes hands with whatever stands on it: its works, its road and
 * any piece on it stay where they are. Both towns are re-seated, and both
 * empires see the new border at once.
 */
export function runEncroachment(state: GameState): void {
  for (const player of realPlayers(state)) {
    if (player.eliminated) continue;
    for (const { effect } of effectsOfKind(state, player.id, 'encroach')) {
      if (!firesNow(state, effect.every)) continue;
      // The list of towns is taken before anything moves, in founding order.
      for (const town of citiesOf(state, player.id)) {
        if (town.population < effect.minPopulation) continue;
        const taken = hexToTake(state, town);
        if (taken === null) continue;
        state.tileOwner[tileIndex(state.map, taken.tile.col, taken.tile.row)] = town.id;
        // The ground moved (batch M3, `slate.ts`), as `claimTile` says.
        bumpEconomy(state);
        refreshCityDerived(state, taken.from);
        refreshCityDerived(state, town);
        recomputeVisibilityFor(state, [player.id, taken.from.ownerId]);
      }
    }
  }
}

/**
 * **The hex this town takes**, or `null` when there is none. A hex of another
 * empire's town that lies beside this town's borders (so the two towns'
 * borders touch), that is not a town centre, that nobody works, and whose town
 * has fewer citizens than this one. The nearest to this town's centre wins,
 * and a tie goes to the lower hex index.
 *
 * The town's hexes are walked over the whole owner array, because a town's
 * borders may reach beyond its work radius (a claim), and in index order, so
 * the answer is a fact about the board.
 */
function hexToTake(state: GameState, town: City): { tile: Tile; from: City } | null {
  const { map } = state;
  const centre = tileHex(cityTile(map, town));
  let best: { tile: Tile; from: City; distance: number; index: number } | null = null;
  for (let index = 0; index < state.tileOwner.length; index++) {
    if (state.tileOwner[index] !== town.id) continue;
    const own = map.tiles[index];
    if (!own) continue;
    for (const next of neighborTiles(map, tileHex(own))) {
      const at = tileIndex(map, next.col, next.row);
      const holder = state.tileOwner[at];
      if (holder === null || holder === undefined || holder === town.id) continue;
      const from = cityById(state, holder);
      if (!from || from.ownerId === town.ownerId) continue;
      if (from.population >= town.population) continue;
      if (cityAt(state, next.col, next.row) !== undefined) continue;
      if (from.workedTiles.some((cell) => cell.col === next.col && cell.row === next.row)) continue;
      const distance = wrappedDistance(map, centre, tileHex(next));
      if (best === null || distance < best.distance || (distance === best.distance && at < best.index)) {
        best = { tile: next, from, distance, index: at };
      }
    }
  }
  return best === null ? null : { tile: best.tile, from: best.from };
}

// --- Migration and The Great Migration ---------------------------------------

/**
 * The `migration` phase: **citizens move between towns on the empires'
 * happiness** (Migration and The Great Migration). See `CardMigrationEffect`.
 *
 * Every real empire's happiness is read once, before anybody moves, so the
 * order in which two empires' cards fire changes nothing about who is happier.
 * It is read only on a turn when some card fires.
 */
export function runMigrations(state: GameState): void {
  const players = realPlayers(state).filter((player) => !player.eliminated);
  const firing = players.map((player) =>
    effectsOfKind(state, player.id, 'migration').filter(({ effect }) => firesNow(state, effect.every)),
  );
  if (firing.every((list) => list.length === 0)) return;
  const mood = players.map((player) => happinessOf(state, player.id));
  players.forEach((player, seat) => {
    for (const { effect } of firing[seat] ?? []) {
      if (effect.source === 'own') {
        if ((mood[seat] ?? 0) <= 0) migrateWithin(state, player);
      } else {
        migrateAcross(state, player, players, mood, seat, effect.reach ?? 3);
      }
    }
  });
}

/**
 * **Migration** (the triage's reading 36, which waits for the user): the
 * empire's largest town sends one citizen to its smallest town joined to the
 * capital, if that town has fewer citizens. Ties go to the earlier town. The
 * citizen arrives as a population windfall without growth riders, as a levied
 * citizen comes home (The Mit'a), so it counts for the town's largest size.
 */
function migrateWithin(state: GameState, player: Player): void {
  let sender: City | null = null;
  for (const town of citiesOf(state, player.id)) {
    if (sender === null || town.population > sender.population) sender = town;
  }
  if (sender === null) return;
  let receiver: City | null = null;
  for (const { city } of connectedCities(state, player.id)) {
    if (city.id === sender.id) continue;
    if (receiver === null || city.population < receiver.population) receiver = city;
  }
  if (receiver === null || receiver.population >= sender.population) return;
  moveCitizen(state, sender, receiver);
}

/**
 * **The Great Migration** (the triage's reading 37): while this empire's
 * happiness is above nought and above another empire's, each town of that
 * empire within `reach` hexes of this empire's borders, with at least two
 * citizens, loses one to this empire's town nearest it. The towns are walked in
 * founding order.
 */
function migrateAcross(
  state: GameState,
  player: Player,
  players: readonly Player[],
  mood: readonly number[],
  seat: number,
  reach: number,
): void {
  const mine = mood[seat] ?? 0;
  if (mine <= 0) return;
  for (const town of [...state.cities]) {
    if (town.ownerId === player.id || town.population < 2) continue;
    const theirs = players.findIndex((other) => other.id === town.ownerId);
    if (theirs < 0 || (mood[theirs] ?? 0) >= mine) continue;
    if (!withinReachOfBorders(state, player.id, cityTile(state.map, town), reach)) continue;
    const receiver = nearestOwnedCity(state, player.id, { col: town.col, row: town.row });
    if (!receiver) continue;
    moveCitizen(state, town, receiver);
  }
}

/**
 * One citizen leaves a town and joins another. The town that loses it gives it
 * up through `loseCitizen`, the routine a famine and a levy use, and a town of
 * one citizen gives nothing. The town that gains it takes it through
 * `settlePopulationWindfall` with no growth riders, which re-seats it.
 */
function moveCitizen(state: GameState, from: City, to: City): void {
  if (loseCitizen(state, from) === null) return;
  refreshCityDerived(state, from);
  settlePopulationWindfall(state, to, 1, { riders: false });
}
