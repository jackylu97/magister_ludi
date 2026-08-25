/**
 * Where the ruins and the villages stand: the last pass of map generation.
 *
 * Deliberately a module of its own rather than half of `discoveries.ts`, and the
 * split is the same one `startPositions.ts` makes against `resources.ts`: the
 * *scatter* is generation — it reads a map, rolls the generator's own dice and
 * knows nothing about players, cities or yields — while the *claim* is play, and
 * play needs `cities.ts` and `tech.ts` to settle a boon. Keeping them apart is
 * what stops `mapgen.ts` acquiring a second import edge into the city rules for
 * the sake of one scatter.
 *
 * Last, and that ordering is load-bearing
 * ---------------------------------------
 * This runs after `placeResources`, which is itself after the rivers, which is
 * itself after every noise field — the same discipline every pass before it keeps
 * (see `generateMap`). Every draw made here is a draw nothing before it can see,
 * so terrain, hills, features, river edges and resources on a given seed are
 * bit-identical to what they were before discoveries existed. A pass that rolled
 * earlier would have moved every wheat field on every map in the game.
 *
 * Dealt per continent, not per map (2026-08-25 retune)
 * ------------------------------------------------------
 * At a flat rate per thousand land tiles, the whole map read as one grey
 * average — measured, on standard, at a nearest site 7-16 hexes from the
 * capital, which is far past what a scout finds in the early game. The fix
 * borrows the shape `dealContinentLuxuries` already uses: carve the map into
 * continents (`carveContinents`, `resources.ts` — the *same* regions the luxury
 * deal reads, recomputed here rather than threaded through `mapgen.ts`, because
 * the carve is a pure function of `(map, config)` and costs nothing on the dice
 * stream — it takes no `Rng`), then deal every continent its own
 * `sitesPerContinent` sites, split `ruinShare` ruins to the rest villages. A
 * region now reads as having *some* ruins nearby rather than the map having a
 * budget somewhere in it.
 *
 * What ground may hold a site
 * ---------------------------
 * Passable land (so no mountains and no sea — a ruin nothing can walk to is a
 * decoration), carrying **no resource**, standing `minDistanceFromStart` from
 * every possible start and `minDistanceApart` from every site already placed.
 *
 * The resource exclusion is presentation as much as rule: a hex already drawing a
 * wheat sheaf and a reveal marker does not also want broken columns on it, and a
 * player who cannot tell the two props apart cannot tell what walking there would
 * do. It is cheap — a resource sits on well under a tenth of the land.
 *
 * The start exclusion is the whole reason a discovery is worth walking to. Inside
 * a capital's opening rings it would be claimed on turn one by whichever warrior
 * happened to be adjacent, which is a gift; six hexes out it is a decision about
 * where to send a scout. It is measured against the **maximum roster's** starts,
 * exactly as the resource guarantees are (`resources.ts`), because a short
 * roster's starts are a prefix of a full one's — so one map is fair to a duel and
 * to twelve seats without being generated twice.
 *
 * Per-continent counts are still a *ceiling*, not a promise
 * -----------------------------------------------------------
 * `sitesPerContinent` is a budget counted against one continent's legal ground,
 * and the spacing rule then thins it: a continent with room seats every site it
 * was dealt, a cramped or heavily-settled one seats what it has room for. That is
 * the honest behaviour and it is `assignOases`'s bargain exactly — the
 * alternative is a sweep that keeps searching until it hits a quota and packs the
 * last few in at the spacing floor, which is a clump wearing a budget's clothes.
 *
 * The fairness top-up
 * --------------------
 * Per-continent dealing evens out the *map's* read but says nothing about any
 * one start: a start planted at the corner of a large continent can still land
 * far from every site its own continent was dealt. `ensureStartDiscoveries`
 * closes that gap the way `ensureStartFood` closes the food one — no dice, a
 * fixed nearest-first order — by walking every possible start and, where fewer
 * than `fairness.minWithinRadius` sites already stand within `fairness.radius`
 * hexes, planting more on the nearest still-legal ground within
 * `fairness.radius` — drawn from the very list `minDistanceFromStart` already
 * filtered off **every** possible start, so the exclusion that keeps a
 * discovery from being a turn-one freebie is never the thing that relaxes.
 * What relaxes is the spacing between sites, `ensureStartFood`'s bargain, and,
 * failing even that, the floor itself: measured against the *maximum* roster,
 * a low-priority candidate start can find its whole radius inside closer
 * starts' exclusion zones, and it simply keeps whatever the deal already gave
 * it rather than buying its own floor with someone else's capital ring.
 */

import {
  DISCOVERY_DATA,
  type DiscoveryKind,
} from './discoveryData';
import type { Hex } from './hex';
import { type GameMap, type Tile, tileHex, tileIndex, wrappedDistance } from './map';
import { type Rng, nextInt, shuffle } from './rng';
import type { ResourceConfig } from './resources';
import { carveContinents } from './resources';
import { RULES } from './rulesData';
import { chooseStartPositions } from './startPositions';
import { isWaterTerrain, moveCost } from './terrainData';

const PLACEMENT = DISCOVERY_DATA.placement;

/** Can a unit ever stand here? The same test `startPositions.ts` candidates on. */
function isSiteCandidate(tile: Tile): boolean {
  if (tile.resource !== undefined) return false;
  return moveCost(tile.terrain, tile.feature, tile.hills) !== null;
}

/** How many land tiles this map has. Kept for callers that still want a census. */
function landCount(map: GameMap): number {
  let land = 0;
  for (const tile of map.tiles) if (!isWaterTerrain(tile.terrain)) land += 1;
  return land;
}

/**
 * Scatters both kinds over the map, in place. Deterministic in `(map, rng)`
 * plus the resource config it borrows `carveContinents`'s parameters from —
 * see the module docblock.
 *
 * One global shuffle, then a per-continent deal, then the fairness top-up. The
 * shuffle decides *which* legal hexes on a given continent are considered
 * first; the deal then takes, continent by continent in id order, whatever
 * still satisfies the spacing — ruins before villages, which biases nothing
 * because the list both are walking was already shuffled.
 *
 * The spacing is enforced across **both** kinds, **every** continent and the
 * fairness top-up at once, from one list of what has been placed. Two ruins
 * four hexes apart and a ruin four hexes from a village are the same crowding
 * on the board, and a rule that only kept each kind (or each continent) away
 * from its own would have produced exactly the pairs a player reads as one
 * site.
 */
export function placeDiscoveries(map: GameMap, rng: Rng, resourceConfig: ResourceConfig): void {
  if (landCount(map) === 0) return;

  const starts = chooseStartPositions(map, RULES.game.maxPlayers);
  const startHexes = starts.map((tile) => tileHex(tile));
  const farFromStarts = (tile: Tile): boolean => {
    const hex = tileHex(tile);
    return startHexes.every(
      (start) => wrappedDistance(map, hex, start) >= PLACEMENT.minDistanceFromStart,
    );
  };

  const candidates = map.tiles.filter((tile) => isSiteCandidate(tile) && farFromStarts(tile));
  // Shuffled in place on a fresh array — `filter` already made one, so nothing
  // the generator will read again is reordered.
  shuffle(rng, candidates);

  // Carving rolls nothing (`carveContinents` takes no `Rng`), so grouping the
  // already-shuffled list by continent moves no later draw — see the module
  // docblock's "costs nothing on the dice stream" claim.
  const continents = carveContinents(map, resourceConfig);
  const byContinent: Tile[][] = Array.from({ length: continents.count }, () => []);
  for (const tile of candidates) {
    const continent = continents.of[tileIndex(map, tile.col, tile.row)]!;
    if (continent >= 0) byContinent[continent]!.push(tile);
  }

  const placed: Hex[] = [];
  const counts = { ruins: 0, village: 0 };
  const spacing = PLACEMENT.minDistanceApart;
  const sweep = (list: readonly Tile[], kind: DiscoveryKind, budget: number): void => {
    let seated = 0;
    for (const tile of list) {
      if (seated >= budget) break;
      if (tile.discovery !== undefined) continue;
      const hex = tileHex(tile);
      if (placed.some((other) => wrappedDistance(map, hex, other) < spacing)) continue;
      tile.discovery = kind;
      placed.push(hex);
      counts[kind] += 1;
      seated += 1;
    }
  };

  const { min: perMin, max: perMax } = PLACEMENT.sitesPerContinent;
  const min = Math.max(0, Math.round(perMin));
  const max = Math.max(min, Math.round(perMax));
  for (let continent = 0; continent < continents.count; continent++) {
    // The draw happens for every continent in id order, whether or not that
    // continent's candidate list has anything on it — `dealContinentLuxuries`'s
    // bargain exactly, so a continent with no legal ground does not shift every
    // later continent's roll.
    const wanted = min >= max ? min : nextInt(rng, min, max + 1);
    const list = byContinent[continent] ?? [];
    const ruinsWanted = Math.round(wanted * PLACEMENT.ruinShare);
    sweep(list, 'ruins', ruinsWanted);
    sweep(list, 'village', wanted - ruinsWanted);
  }

  ensureStartDiscoveries(map, starts, candidates, placed, counts);
}

/**
 * The fairness top-up (see the module docblock). No dice: nearest-first,
 * ties by tile index, exactly `ensureStartFood`'s order (`resources.ts`).
 *
 * Draws only from `candidates` — the same list the deal itself drew from,
 * already filtered `minDistanceFromStart` off **every** possible start. That
 * exclusion is never relaxed here, on purpose: it is the one rule that keeps a
 * discovery from being a turn-one freebie, and a fairness pass that traded it
 * away to hit its own floor would be handing some *other* seat's capital a
 * ruin next door to fix this one's numbers. What relaxes instead is the
 * spacing between sites (`ensureStartFood`'s bargain) and, failing even that,
 * the floor itself: a start whose reachable ground is entirely claimed by
 * closer starts' exclusion zones — measured against the *maximum* roster, so
 * this is rarer the smaller the real one is — simply keeps whatever the deal
 * already gave it. See the module docblock.
 */
function ensureStartDiscoveries(
  map: GameMap,
  starts: readonly Tile[],
  candidates: readonly Tile[],
  placed: Hex[],
  counts: { ruins: number; village: number },
): void {
  const { radius, minWithinRadius } = PLACEMENT.fairness;
  const spacing = PLACEMENT.minDistanceApart;
  if (minWithinRadius <= 0) return;

  for (const start of starts) {
    const from = tileHex(start);
    let within = 0;
    for (const hex of placed) if (wrappedDistance(map, from, hex) <= radius) within += 1;
    if (within >= minWithinRadius) continue;

    // Nearest first, ties by tile index, so the top-up lands on the hex a
    // scout would reach first and lands in the same place every time.
    const ordered = candidates
      .filter((tile) => tile.discovery === undefined)
      .map((tile) => ({
        tile,
        hex: tileHex(tile),
        distance: wrappedDistance(map, from, tileHex(tile)),
        index: tileIndex(map, tile.col, tile.row),
      }))
      .filter((entry) => entry.distance <= radius)
      .sort((a, b) => a.distance - b.distance || a.index - b.index);

    /** The first still-open candidate, preferring the spacing rule. */
    const pick = (respectSpacing: boolean): (typeof ordered)[number] | null => {
      for (const entry of ordered) {
        if (respectSpacing && placed.some((other) => wrappedDistance(map, entry.hex, other) < spacing)) {
          continue;
        }
        return entry;
      }
      return null;
    };

    let need = minWithinRadius - within;
    while (need > 0) {
      // Spacing is an aesthetic rule and the floor is a guarantee, so a start
      // hemmed in by other finds gets its site anyway — `ensureStartFood`'s
      // bargain exactly. `minDistanceFromStart` is not this pass's to relax;
      // see the docblock above.
      const chosen = pick(true) ?? pick(false);
      if (!chosen) break; // This start's ground within radius is exhausted.
      const total = counts.ruins + counts.village;
      // Whichever kind is furthest below its share gets the next top-up site,
      // so the fairness pass does not quietly skew the ruins/villages split it
      // has no dice to draw for.
      const kind: DiscoveryKind =
        total === 0 || counts.ruins / total < PLACEMENT.ruinShare ? 'ruins' : 'village';
      chosen.tile.discovery = kind;
      counts[kind] += 1;
      placed.push(chosen.hex);
      const at = ordered.indexOf(chosen);
      if (at >= 0) ordered.splice(at, 1);
      need -= 1;
    }
  }
}

/**
 * Every tile carrying a discovery, in map order.
 *
 * A pure read for the renderer's fingerprint and for tests. In map order rather
 * than in placement order, for `improvedCells`'s reason: "what is on the board"
 * is a question about the board, and an order that depended on history would make
 * two identical states hash differently.
 */
export function discoveryCells(map: GameMap): { col: number; row: number; kind: DiscoveryKind }[] {
  const out: { col: number; row: number; kind: DiscoveryKind }[] = [];
  for (const tile of map.tiles) {
    if (tile.discovery === undefined) continue;
    out.push({ col: tile.col, row: tile.row, kind: tile.discovery });
  }
  return out;
}
