/**
 * What each figure's start is measured against — one list, two sweeps.
 *
 * The M1 verification (`test/stress/leaderStarts.slow.test.ts`) asks how often a
 * seat gets the ground its figure wants, with the figures on and with the chairs
 * empty. The M2 sweep (`test/mapgen/startSpacing.slow.test.ts`) asks what raising
 * the floor and reordering the seating ladder cost those same rates. Two
 * questions, one list of claims — so the list lives here rather than in either,
 * because a criterion edited in one sweep and not the other is two measurements
 * that look comparable and are not.
 *
 * A non-test module for the reason CLAUDE.md gives: importing a `.test.ts` file
 * re-registers its tests.
 */

import type { GameMap, Tile } from '../../src/sim/map';
import { mapRange, tileHex, tileNeighbors } from '../../src/sim/map';
import { improvementForResource } from '../../src/sim/improvementData';
import type { LeaderId } from '../../src/sim/leaderData';
import { resourceDef, tileSuitsResource } from '../../src/sim/resourceData';

/** Hexes within `radius` of a start, the start itself included. */
export function near(map: GameMap, start: Tile, radius: number): Tile[] {
  return mapRange(map, tileHex(start), radius);
}

export function hasRiver(map: GameMap, start: Tile, radius: number): boolean {
  return near(map, start, radius).some((tile) => tile.riverEdges !== 0);
}

export function countTerrain(
  map: GameMap,
  start: Tile,
  radius: number,
  what: (tile: Tile) => boolean,
): number {
  return near(map, start, radius).filter(what).length;
}

/** Dry country, the three faces of it — `hexAnswers`' own sentence. */
export function isArid(tile: Tile): boolean {
  return tile.terrain === 'desert' || tile.feature === 'oasis' || tile.feature === 'floodplain';
}

/** How many of the six hexes touching a start are dry country. The (uuuu) figure. */
export function aridNeighbours(map: GameMap, start: Tile): number {
  return tileNeighbors(map, start).filter(isArid).length;
}

/** A hex a pasture could ever stand on — the ground Modu's herds need. */
export function pastureGround(tile: Tile): boolean {
  return ['horses', 'cattle', 'bison'].some((id) =>
    tileSuitsResource(tile, resourceDef(id as never)),
  );
}

/** Is a resource opened by this improvement kind standing in reach? */
export function hasKind(map: GameMap, start: Tile, radius: number, kind: string): boolean {
  return near(map, start, radius).some(
    (tile) => tile.resource !== undefined && improvementForResource(tile.resource) === kind,
  );
}

/** One measurable claim about a seat's ground. */
export interface Criterion {
  leader: LeaderId;
  label: string;
  /**
   * True when the row's own sheet **backs** this claim with a hard want
   * (`startBias.wants`) or a furnishing — the two halves of M1b. A backed claim
   * is held on all but a seed or two and is asserted at a floor; an unbacked one
   * rides the soft score alone and is only asked to improve.
   */
  backed?: true;
  holds(map: GameMap, start: Tile): boolean;
}

export const CRITERIA: Criterion[] = [
  {
    leader: 'pachacuti',
    label: 'a mountain within 2',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.terrain === 'mountain') > 0,
  },
  {
    leader: 'pachacuti',
    label: 'three hills within 2',
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.hills) >= 3,
  },
  {
    leader: 'pachacuti',
    label: 'a river within 1',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 1),
  },
  {
    leader: 'taizong',
    label: 'grassland within 2',
    backed: true,
    holds: (map, start) => countTerrain(map, start, 2, (tile) => tile.terrain === 'grassland') > 0,
  },
  {
    leader: 'modu',
    label: 'horses within 4',
    backed: true,
    holds: (map, start) => near(map, start, 4).some((tile) => tile.resource === 'horses'),
  },
  {
    leader: 'modu',
    label: 'two pasture hexes within 3',
    holds: (map, start) => countTerrain(map, start, 3, pastureGround) >= 2,
  },
  {
    leader: 'akhenaten',
    label: 'river or floodplain within 1',
    backed: true,
    holds: (map, start) =>
      hasRiver(map, start, 1) ||
      countTerrain(map, start, 1, (tile) => tile.feature === 'floodplain') > 0,
  },
  {
    // Ruled 2026-09-11, `docs/flags.md` (uuuu): the old claim was one arid hex
    // within two rings, which a river valley with a dune in sight answers. The
    // ask was the sand itself, so the claim is now the neighbours.
    leader: 'akhenaten',
    label: 'three arid neighbours',
    backed: true,
    holds: (map, start) => aridNeighbours(map, start) >= 3,
  },
  {
    leader: 'almamun',
    label: 'a river within 2',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 2),
  },
  {
    leader: 'mithridates',
    label: 'a river within 2',
    backed: true,
    holds: (map, start) => hasRiver(map, start, 2),
  },
  {
    leader: 'mithridates',
    label: 'a camp kind within 3',
    backed: true,
    holds: (map, start) => hasKind(map, start, 3, 'camp'),
  },
  {
    leader: 'mithridates',
    label: 'a plantation kind within 3',
    backed: true,
    holds: (map, start) => hasKind(map, start, 3, 'plantation'),
  },
];

/**
 * Every criterion's rate before M2 and after it, in seeds out of `SEEDS`.
 *
 * `m1` is what `test/stress/leaderStarts.slow.test.ts` measured when the wants
 * shipped (`docs/mapgen.md`'s own table, the seated column); `m2` is what this
 * sweep measures now and is the floor it pins. Both columns are here because the
 * interesting number is the difference: a want that fell tells a designer the
 * spacing is now buying the distance out of somebody's ground, and a table that
 * only carried today's rate would hide that.
 *
 * A criterion with no row fails the sweep — the two lists are kept in step the
 * way every doc table in this tree is.
 */
export const RATES: Record<string, { m1: number; m2: number }> = {
  'pachacuti · a mountain within 2': { m1: 24, m2: 24 },
  'pachacuti · three hills within 2': { m1: 24, m2: 24 },
  'pachacuti · a river within 1': { m1: 24, m2: 24 },
  'taizong · grassland within 2': { m1: 24, m2: 24 },
  'modu · horses within 4': { m1: 24, m2: 24 },
  'modu · two pasture hexes within 3': { m1: 24, m2: 24 },
  'akhenaten · river or floodplain within 1': { m1: 24, m2: 23 },
  // New with (uuuu): M1 had no such claim, so its column is the rate the old
  // sheet happened to deliver — Akhenaten stood in three hexes of sand on none
  // of the twenty-four boards, which is the measurement the ruling exists
  // because of.
  'akhenaten · three arid neighbours': { m1: 0, m2: 11 },
  'almamun · a river within 2': { m1: 24, m2: 20 },
  'mithridates · a river within 2': { m1: 24, m2: 19 },
  'mithridates · a camp kind within 3': { m1: 24, m2: 24 },
  'mithridates · a plantation kind within 3': { m1: 24, m2: 24 },
};
